'use client'

import { useCallback, useMemo, useState } from 'react'
import type { AppProps } from '@/apps/_types'
import AgendaView from '@/apps/calendar/AgendaView'
import CalendarCard from '@/apps/calendar/CalendarCard'
import CalendarHeader from '@/apps/calendar/CalendarHeader'
import DayView from '@/apps/calendar/DayView'
import { toDateString } from '@/apps/calendar/dateUtils'
import EventDetail from '@/apps/calendar/EventDetail'
import EventPopover from '@/apps/calendar/EventPopover'
import GoogleCalendarConnect from '@/apps/calendar/GoogleCalendarConnect'
import MonthView from '@/apps/calendar/MonthView'
import type { CalendarView } from '@/apps/calendar/types'
import { useCalendarEvents } from '@/apps/calendar/useCalendarEvents'
import { useGoogleCalendarConnection } from '@/apps/calendar/useGoogleCalendarConnection'
import { useGoogleCalendarEvents } from '@/apps/calendar/useGoogleCalendarEvents'
import WeekView from '@/apps/calendar/WeekView'
import { useEntityStore } from '@/core/entityStore'

function getVisibleRange(view: CalendarView, selectedDate: string): { start: string; end: string } {
	const d = new Date(`${selectedDate}T00:00:00`)

	if (view === 'month') {
		const first = new Date(d.getFullYear(), 0, 1)
		const last = new Date(d.getFullYear(), 11, 31)
		// Extend to cover grid overflow days
		first.setDate(first.getDate() - 7)
		last.setDate(last.getDate() + 7)
		return { start: first.toISOString(), end: last.toISOString() }
	}

	if (view === 'week') {
		const dayOfWeek = (d.getDay() + 6) % 7
		const weekStart = new Date(d)
		weekStart.setDate(d.getDate() - dayOfWeek)
		const weekEnd = new Date(weekStart)
		weekEnd.setDate(weekStart.getDate() + 7)
		return { start: weekStart.toISOString(), end: weekEnd.toISOString() }
	}

	if (view === 'day') {
		const dayEnd = new Date(d)
		dayEnd.setDate(d.getDate() + 1)
		return { start: d.toISOString(), end: dayEnd.toISOString() }
	}

	// agenda: generous upper bound — AgendaView's daysAhead controls display
	const agendaEnd = new Date(d)
	agendaEnd.setDate(d.getDate() + 90)
	return { start: d.toISOString(), end: agendaEnd.toISOString() }
}

async function getErrorFromResponse(res: Response, fallback: string): Promise<string> {
	const payload = (await res.json().catch(() => null)) as { error?: string } | null
	const raw = payload?.error ?? fallback
	if (raw === 'Not connected')
		return 'Google Calendar is not connected. Click Connect Google Calendar.'
	if (raw === 'Token revoked') return 'Google connection expired. Reconnect Google Calendar.'
	if (raw === 'Google Calendar OAuth is not configured') {
		return 'Server Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.'
	}
	return raw
}

export default function CalendarApp({ dispatch, entityId, mode }: AppProps) {
	// Read view & selectedDate directly from entity store — single source of truth
	// shared with CalendarViewSwitcher in the window header
	const entityState = useEntityStore((s) => s.entities[entityId]?.state)
	const view = ((entityState?.view as CalendarView) ?? 'month') as CalendarView
	const selectedDate = ((entityState?.selected_date as string) ??
		toDateString(new Date())) as string

	const [popover, setPopover] = useState<
		| { type: 'create'; dateTime: string; pos: { x: number; y: number } }
		| { type: 'detail'; eventId: string; pos: { x: number; y: number } }
		| null
	>(null)
	const [syncError, setSyncError] = useState<string | null>(null)

	const upsert = useEntityStore((s) => s.upsert)
	const getEntity = useEntityStore((s) => s.getEntity)

	const range = useMemo(() => getVisibleRange(view, selectedDate), [view, selectedDate])
	const localEvents = useCalendarEvents(range)

	const { isConnected } = useGoogleCalendarConnection()
	const {
		events: googleEvents,
		error: googleError,
		refetch: refetchGoogleEvents,
	} = useGoogleCalendarEvents(range, isConnected)

	const events = useMemo(() => {
		if (googleEvents.length === 0) return localEvents
		return [...localEvents, ...googleEvents].sort((a, b) =>
			a.state.start.localeCompare(b.state.start),
		)
	}, [localEvents, googleEvents])

	const handleSetView = useCallback(
		(v: CalendarView) => {
			dispatch('set_view', { view: v })
		},
		[dispatch],
	)

	const handleSetDate = useCallback(
		(d: string) => {
			dispatch('set_date', { date: d })
		},
		[dispatch],
	)

	const handleNavigate = useCallback(
		(direction: -1 | 1) => {
			const d = new Date(`${selectedDate}T00:00:00`)
			if (view === 'month') {
				d.setFullYear(d.getFullYear() + direction)
			} else if (view === 'week') {
				d.setDate(d.getDate() + direction * 7)
			} else {
				d.setDate(d.getDate() + direction)
			}
			handleSetDate(toDateString(d))
		},
		[selectedDate, view, handleSetDate],
	)

	const handleToday = useCallback(() => {
		handleSetDate(toDateString(new Date()))
	}, [handleSetDate])

	const handleSelectDay = useCallback(
		(date: string) => {
			handleSetDate(date)
			handleSetView('day')
		},
		[handleSetDate, handleSetView],
	)

	const handleClickSlot = useCallback((dateTime: string) => {
		setPopover({ type: 'create', dateTime, pos: { x: 200, y: 200 } })
	}, [])

	const handleClickEvent = useCallback((eventId: string) => {
		setPopover({ type: 'detail', eventId, pos: { x: 200, y: 200 } })
	}, [])

	const handleCreateEvent = useCallback(
		async (eventData: { title: string; start: string; end: string }) => {
			if (isConnected) {
				setSyncError(null)
				try {
					const res = await fetch('/api/google-calendar/events', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify(eventData),
					})
					if (!res.ok) {
						throw new Error(
							await getErrorFromResponse(res, `Failed to create Google event (${res.status})`),
						)
					}
					await refetchGoogleEvents()
				} catch (err) {
					console.error(err)
					setSyncError((err as Error).message)
				} finally {
					setPopover(null)
				}
				return
			}

			const calendarEntity = getEntity(entityId)
			if (!calendarEntity) return
			const newId = crypto.randomUUID()
			upsert({
				id: newId,
				space_id: calendarEntity.space_id,
				user_id: calendarEntity.user_id,
				type: 'calendar_event',
				presentation: 'hidden',
				position: { x: 0, y: 0, locked: false },
				size: { width: 0, height: 0 },
				z_index: 0,
				content: '',
				state: {
					title: eventData.title,
					start: eventData.start,
					end: eventData.end,
					all_day: false,
				},
				summary: eventData.title,
				created_by: 'user',
				archived: false,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			})
			setPopover(null)
		},
		[entityId, getEntity, isConnected, refetchGoogleEvents, upsert],
	)

	const handleUpdateEvent = useCallback(
		async (eventId: string, changes: Record<string, unknown>) => {
			const event = events.find((e) => e.id === eventId)
			if (!event) return

			if (event.source === 'google') {
				const googleEventId = event.id.replace(/^gcal-/, '')
				const payload: { title?: string; start?: string; end?: string } = {}
				if (typeof changes.title === 'string') payload.title = changes.title
				if (typeof changes.start === 'string') payload.start = changes.start
				if (typeof changes.end === 'string') payload.end = changes.end
				if (Object.keys(payload).length === 0) return

				setSyncError(null)
				try {
					const res = await fetch(
						`/api/google-calendar/events/${encodeURIComponent(googleEventId)}`,
						{
							method: 'PATCH',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify(payload),
						},
					)
					if (!res.ok) {
						throw new Error(
							await getErrorFromResponse(res, `Failed to update Google event (${res.status})`),
						)
					}
					await refetchGoogleEvents()
				} catch (err) {
					console.error(err)
					setSyncError((err as Error).message)
				}
				return
			}

			const entity = getEntity(eventId)
			if (!entity) return
			upsert({
				...entity,
				state: { ...entity.state, ...changes },
				updated_at: new Date().toISOString(),
			})
		},
		[events, getEntity, refetchGoogleEvents, upsert],
	)

	const handleDeleteEvent = useCallback(
		async (eventId: string) => {
			const event = events.find((e) => e.id === eventId)
			if (!event) return

			if (event.source === 'google') {
				setSyncError(null)
				try {
					const googleEventId = event.id.replace(/^gcal-/, '')
					const res = await fetch(
						`/api/google-calendar/events/${encodeURIComponent(googleEventId)}`,
						{
							method: 'DELETE',
						},
					)
					if (!res.ok) {
						throw new Error(
							await getErrorFromResponse(res, `Failed to delete Google event (${res.status})`),
						)
					}
					await refetchGoogleEvents()
					setPopover(null)
				} catch (err) {
					console.error(err)
					setSyncError((err as Error).message)
				}
				return
			}

			const entity = getEntity(eventId)
			if (!entity) return
			upsert({ ...entity, archived: true, updated_at: new Date().toISOString() })
			setPopover(null)
		},
		[events, getEntity, refetchGoogleEvents, upsert],
	)

	const date = new Date(`${selectedDate}T00:00:00`)

	if (mode === 'card') {
		return <CalendarCard />
	}

	return (
		<div className="flex h-full flex-col">
			<CalendarHeader
				view={view}
				selectedDate={selectedDate}
				onNavigate={handleNavigate}
				onToday={handleToday}
				trailing={<GoogleCalendarConnect />}
			/>
			{(syncError || googleError) && (
				<div className="px-3 pb-1 text-label text-error">{syncError ?? googleError}</div>
			)}

			<div key={view} className="relative flex-1 transition-opacity duration-150">
				{view === 'month' && (
					<MonthView
						year={date.getFullYear()}
						selectedDate={selectedDate}
						events={events}
						onSelectDay={handleSelectDay}
					/>
				)}
				{view === 'week' && (
					<WeekView
						selectedDate={selectedDate}
						events={events}
						onClickSlot={handleClickSlot}
						onClickEvent={handleClickEvent}
					/>
				)}
				{view === 'day' && (
					<DayView
						selectedDate={selectedDate}
						events={events}
						onClickSlot={handleClickSlot}
						onClickEvent={handleClickEvent}
					/>
				)}
				{view === 'agenda' && (
					<AgendaView selectedDate={selectedDate} events={events} onClickEvent={handleClickEvent} />
				)}
			</div>

			{/* Popovers */}
			{popover?.type === 'create' && (
				<EventPopover
					startDateTime={popover.dateTime}
					position={popover.pos}
					onSave={handleCreateEvent}
					onDismiss={() => setPopover(null)}
				/>
			)}
			{popover?.type === 'detail' &&
				(() => {
					const evt = events.find((e) => e.id === popover.eventId)
					if (!evt) return null
					return (
						<EventDetail
							event={evt}
							position={popover.pos}
							onUpdate={handleUpdateEvent}
							onDelete={handleDeleteEvent}
							onDismiss={() => setPopover(null)}
						/>
					)
				})()}
		</div>
	)
}
