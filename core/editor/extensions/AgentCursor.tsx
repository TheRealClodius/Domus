import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

const agentCursorKey = new PluginKey('agentCursor')

export const AgentCursor = Extension.create({
	name: 'agentCursor',

	addOptions() {
		return {
			position: null as number | null,
			streaming: false,
		}
	},

	addProseMirrorPlugins() {
		const extension = this

		return [
			new Plugin({
				key: agentCursorKey,
				props: {
					decorations(state) {
						const pos = extension.options.position
						if (pos === null || pos === undefined) return DecorationSet.empty
						if (pos < 0 || pos > state.doc.content.size) return DecorationSet.empty

						const widget = Decoration.widget(pos, () => {
							const cursor = document.createElement('span')
							cursor.className = 'agent-cursor'
							cursor.setAttribute('data-agent-cursor', '')
							if (extension.options.streaming) {
								cursor.setAttribute('data-streaming', '')
							}
							return cursor
						})

						return DecorationSet.create(state.doc, [widget])
					},
				},
			}),
		]
	},
})
