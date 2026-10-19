import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'
import React from 'react'
import { Config } from '../lib/index.js'

async function loadClient() {
  let client
  const source = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8')
  runInNewContext(source, {
    window: {
      __ModuleLoader__: {
        load({ id, factory }) {
          assert.equal(id, 'dsh-notify')
          client = factory((name) => {
            assert.equal(name, 'react')
            return {
              ...React,
              useState: (initial) => [typeof initial === 'function' ? initial() : initial],
              useEffect: () => {},
            }
          })
        },
      },
    },
  })
  return client
}

test('notification events are exposed as live settings', () => {
  assert.equal(Config.dict.events.meta.volatile, true)
  assert.equal(Config.dict.events.dict.turnCompleted.meta.default, true)
})

test('settings page uses the host configForms service and edits nested events', async () => {
  const client = await loadClient()
  assert.deepEqual(Array.from(client.inject), ['slots', 'configForms'])
  let section
  let props
  const writes = []
  const events = { turnCompleted: true, permissionAsked: false }
  const form = {
    getSnapshot: () => ({ status: 'ready', writable: true, value: { events } }),
    set: (...args) => { writes.push(args) },
  }
  client.apply({
    configForms: {
      get(id) {
        assert.equal(id, 'dsh-notify')
        return form
      },
    },
    slots: {
      inject(name, factory) {
        assert.equal(name, 'settings.section')
        return factory()
      },
      register(options, component) {
        assert.equal(options.id, 'dsh-notify')
        section = component
        props = options.inject()
        return () => {}
      },
    },
  })
  const tree = section(props)
  const rows = React.Children.toArray(tree.props.children).filter((child) => child.type === 'label')
  assert.equal(rows.length, 8)
  const completed = React.Children.toArray(rows[0].props.children)[1]
  const permission = React.Children.toArray(rows[5].props.children)[1]
  assert.equal(completed.props.checked, true)
  assert.equal(permission.props.checked, false)
  completed.props.onChange()
  assert.equal(writes[0][0], 'events')
  assert.deepEqual({ ...writes[0][1] }, { turnCompleted: false, permissionAsked: false })
})
