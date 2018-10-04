import * as React from 'react'
import { shallow, mount } from 'enzyme'

import createAsyncCallComponent from '../index'
import { getChildrenContainer, getResultStoreChildrenContainer, flushPromises } from './common'

describe('HasResult', () => {
  describe('invariants', () => {
    it('should be exposed as static prop from AsyncCall', () => {
      const AsyncCall = createAsyncCallComponent(() => Promise.resolve())
      expect(AsyncCall.ResultStore.HasResult).toBeDefined()
    })

    it('should expose default display name', () => {
      const AsyncCall = createAsyncCallComponent(() => Promise.resolve())
      expect(AsyncCall.ResultStore.HasResult.displayName).toBe('AsyncCall.ResultStore.HasResult')
    })

    it('should throw an error if HasResult component rendered alone', () => {
      const AsyncCall = createAsyncCallComponent(() => Promise.resolve())
      expect(() => shallow(<AsyncCall.ResultStore.HasResult>{() => null}</AsyncCall.ResultStore.HasResult>)).toThrow(
        '<AsyncCall.ResultStore.HasResult> must be a child (direct or indirect) of <AsyncCall.ResultStore>.',
      )
    })

    describe('', () => {
      let spy

      beforeEach(() => {
        spy = jest.spyOn(console, 'error').mockImplementation(() => {})
      })

      afterEach(() => {
        spy.mockRestore()
      })

      it('should throw an error if HasResult component rendered as a direct child of <AsyncCall>', () => {
        const AsyncCall = createAsyncCallComponent(() => Promise.resolve())

        expect(() =>
          mount(
            <AsyncCall params={1}>
              <AsyncCall.ResultStore.HasResult>{() => null}</AsyncCall.ResultStore.HasResult>
            </AsyncCall>,
          ),
        ).toThrow('<AsyncCall.ResultStore.HasResult> must be a child (direct or indirect) of <AsyncCall.ResultStore>.')
      })

      it('should throw an error if children is not passed', () => {
        const AsyncCall = createAsyncCallComponent(value => Promise.resolve(value))

        mount(
          <AsyncCall params="first">
            <AsyncCall.ResultStore>
              <AsyncCall.ResultStore.HasResult />
            </AsyncCall.ResultStore>
          </AsyncCall>,
        )

        expect(spy).toHaveBeenCalled()
        expect(spy.mock.calls[0][0]).toContain(
          'The prop `children` is marked as required in `AsyncCall.ResultStore.HasResult`, but its value is `undefined`',
        )
      })
    })
  })

  describe('render props', () => {
    it('should not call children fn if promise has not been resolved yet', () => {
      const AsyncCall = createAsyncCallComponent(() => Promise.resolve())
      const children = jest.fn(() => null)
      const container = mount(
        <AsyncCall params={{}}>
          <AsyncCall.ResultStore>
            <AsyncCall.ResultStore.HasResult>{children}</AsyncCall.ResultStore.HasResult>
          </AsyncCall.ResultStore>
        </AsyncCall>,
      )

      const resultStoreContainer = getChildrenContainer(container, AsyncCall.ResultStore)
      expect(resultStoreContainer).toExist()

      const resultContainer = getResultStoreChildrenContainer(resultStoreContainer, AsyncCall.ResultStore.HasResult)
      expect(resultContainer).toExist()
      expect(resultContainer).toBeEmptyRender()

      expect(children).not.toHaveBeenCalled()
    })

    it('should not call children fn if promise has been rejected', async done => {
      const AsyncCall = createAsyncCallComponent(() => Promise.reject('error'))
      const children = jest.fn(() => null)
      const container = mount(
        <AsyncCall params={{}}>
          <AsyncCall.ResultStore>
            <AsyncCall.ResultStore.HasResult>{children}</AsyncCall.ResultStore.HasResult>
          </AsyncCall.ResultStore>
        </AsyncCall>,
      )

      await flushPromises()

      const resultStoreContainer = getChildrenContainer(container, AsyncCall.ResultStore)
      expect(resultStoreContainer).toExist()

      const resultContainer = getResultStoreChildrenContainer(resultStoreContainer, AsyncCall.ResultStore.HasResult)
      expect(resultContainer).toExist()
      expect(resultContainer).toBeEmptyRender()

      expect(children).not.toHaveBeenCalled()

      done()
    })

    it('should call children fn and render its result if promise has been resolved', async done => {
      const AsyncCall = createAsyncCallComponent(() => Promise.resolve(42))
      const children = jest.fn(value => <div>result</div>)
      const container = mount(
        <AsyncCall params={{}}>
          <AsyncCall.ResultStore>
            <AsyncCall.ResultStore.HasResult>{children}</AsyncCall.ResultStore.HasResult>
          </AsyncCall.ResultStore>
        </AsyncCall>,
      )

      await flushPromises()
      container.update()

      expect(children).toHaveBeenCalledWith({ result: 42 })

      const resultContainer = getResultStoreChildrenContainer(container, AsyncCall.ResultStore.HasResult)
      expect(resultContainer).toExist()
      expect(resultContainer).not.toBeEmptyRender()
      expect(resultContainer).toHaveText('result')

      done()
    })
  })
})
