'use client'

import { useCallback, useMemo, useState } from 'react'
import type { AppProps } from '@/apps/_types'
import AgendaView from '@/apps/calendar/AgendaView'
import CalendarCard from '@/apps/calendar/CalendarCard'
import CalendarHeader from '@/apps/calendar/CalendarHeader'
import DayView from '@/apps/calendar/DayView'
import EventDetail from '@/apps/calendar/EventDetail'
import EventPopover from '@/apps/calendar/EventPopover'
import MonthView from '@/apps/calendar/MonthView'
import {
	type CalendarState,
	type CalendarView,
	DEFAULT_CALENDAR_STATE,
} from '@/apps/calendar/types'
import { useCalendarEvents } from '@/apps/calendar/useCalendarEvents'
import WeekView from '@/apps/calendar/WeekView'
import { useEntityStore } from '@/core/entityStore'

function parseCalendarState(state: Record<string, unknown>): CalendarState {
	if (state.view && state.selected_date) {
		return state as unknown as CalendarState
	}
	return { ...DEFAULT_CALENDAR_STATE }
}

function getVisibleRange(view: CalendarView, selectedDate: string): { start: string; end: string } {
	const d = new Date(`${selectedDate}T00:00:00`)

	if (view === 'month') {
		const first = new Date(d.getFullYear(), d.getMonth(), 1)
		const last = new Date(d.getFullYear(), d.getMonth() + 1, 0)
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

	// agenda: 14 days ahead
	const agendaEnd = new Date(d)
	agendaEnd.setDate(d.getDate() + 14)
	return { start: d.toISOString(), end: agendaEnd.toISOString() }
}

function toDateString(d: Date): string {
	const y = d.getFullYear()
	const m = String(d.getMonth() + 1).padStart(2, '0')
	const day = String(d.getDate()).padStart(2, '0')
	return `${y}-${m}-${day}`
}

export default function CalendarApp({ state, dispatch, entityId, mode }: AppProps) {
	const initial = parseCalendarState(state)
	const [view, setView] = useState<CalendarView>(initial.view)
	const [selectedDate, setSelectedDate] = useState(initial.selected_date)
	const [popover, setPopover] = useState<
		| { type: 'create'; dateTime: string; pos: { x: number; y: number } }
		| { type: 'detail'; eventId: string; pos: { x: number; y: number } }
		| null
	>(null)

	const upsert = useEntityStore((s) => s.upsert)
	const getEntity = useEntityStore((s) => s.getEntity)

	const range = useMemo(() => getVisibleRange(view, selectedDate), [view, selectedDate])
	const events = useCalendarEvents(range)

	const handleSetView = useCallback(
		(v: CalendarView) => {
			setView(v)
			dispatch('set_view', { view: v })
		},
		[dispatch],
	)

	const handleSetDate = useCallback(
		(d: string) => {
			setSelectedDate(d)
			dispatch('set_date', { date: d })
		},
		[dispatch],
	)

	const handleNavigate = useCallback(
		(direction: -1 | 1) => {
			const d = new Date(`${selectedDate}T00:00:00`)
			if (view === 'month') {
				d.setMonth(d.getMonth() + direction)
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
		(eventData: { title: string; start: string; end: string }) => {
			const calendarEntity = getEntity(entityId)
			if (!calendarEntity) return
			const newId = `cal-event-${Date.now()}`
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
		[entityId, getEntity, upsert],
	)

	const handleUpdateEvent = useCallback(
		(eventId: string, changes: Record<string, unknown>) => {
			const entity = getEntity(eventId)
			if (!entity) return
			upsert({
				...entity,
				state: { ...entity.state, ...changes },
				updated_at: new Date().toISOString(),
			})
		},
		[getEntity, upsert],
	)

	const handleDeleteEvent = useCallback(
		(eventId: string) => {
			const entity = getEntity(eventId)
			if (!entity) return
			upsert({ ...entity, archived: true, updated_at: new Date().toISOString() })
			setPopover(null)
		},
		[getEntity, upsert],
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
				onChangeView={handleSetView}
				onNavigate={handleNavigate}
				onToday={handleToday}
			/>

			<div className="relative flex-1">
				{view === 'month' && (
					<MonthView
						year={date.getFullYear()}
						month={date.getMonth()}
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
