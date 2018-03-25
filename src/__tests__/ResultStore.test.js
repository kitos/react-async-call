import * as React from 'react'
import * as PropTypes from 'prop-types'
import { shallow, mount } from 'enzyme'

import createAsyncCallComponent from '../index'

const flushPromises = () => new Promise(resolve => setImmediate(resolve))

describe('ResultStore', () => {
  it('should be exposed as static prop from AsyncCall', () => {
    const AsyncCall = createAsyncCallComponent(() => Promise.resolve())
    expect(AsyncCall.ResultStore).toBeDefined()
  })

  it('should expose default display names', () => {
    const AsyncCall = createAsyncCallComponent(() => Promise.resolve())
    expect(AsyncCall.ResultStore.displayName).toBe('AsyncCall.ResultStore')
  })

  it('should throw an error if ResultStore component rendered alone', () => {
    const AsyncCall = createAsyncCallComponent(() => Promise.resolve())
    expect(() => shallow(<AsyncCall.ResultStore>{result => null}</AsyncCall.ResultStore>)).toThrow(
      '<AsyncCall.ResultStore> must be a child (direct or indirect) of <AsyncCall>.',
    )
  })

  // The test below is disabled for now because jest do not catch React errors properly
  // See the following issues for further details:
  // https://github.com/facebook/react/issues/11098
  // https://github.com/airbnb/enzyme/issues/1280
  xit('should throw an error if children is not passed', () => {
    const AsyncCall = createAsyncCallComponent(value => Promise.resolve(value))
    expect(() =>
      mount(
        <AsyncCall params="first">
          <AsyncCall.ResultStore />
        </AsyncCall>,
      ),
    ).toThrow()
  })

  it('should not call children function if promise has not been resolved yet', () => {
    const AsyncCall = createAsyncCallComponent(() => Promise.resolve())
    const children = jest.fn(() => null)
    const container = mount(
      <AsyncCall params={{}}>
        <AsyncCall.ResultStore>{children}</AsyncCall.ResultStore>
      </AsyncCall>,
    )

    expect(container.children().exists()).toBe(true)
    const resultStoreContainer = container.childAt(0)
    expect(resultStoreContainer).toBeDefined()
    expect(resultStoreContainer).toHaveEmptyRender()

    expect(children).toHaveBeenCalledWith({ hasResult: false })
  })

  it('should not call children function if promise has been rejected', async done => {
    const AsyncCall = createAsyncCallComponent(() => Promise.reject('error'))
    const children = jest.fn(() => null)
    const container = mount(
      <AsyncCall params={{}}>
        <AsyncCall.ResultStore>{children}</AsyncCall.ResultStore>
      </AsyncCall>,
    )

    await flushPromises()

    expect(container.children().exists()).toBe(true)
    const resultStoreContainer = container.childAt(0)
    expect(resultStoreContainer).toBeDefined()
    expect(resultStoreContainer).toHaveEmptyRender()

    expect(children).toHaveBeenCalledWith({ hasResult: false })

    done()
  })

  it('should call children function and render its result if promise has been resolved', async done => {
    const AsyncCall = createAsyncCallComponent(() => Promise.resolve(42))
    const children = jest.fn(value => <div>result</div>)
    const container = mount(
      <AsyncCall params={{}}>
        <AsyncCall.ResultStore>{children}</AsyncCall.ResultStore>
      </AsyncCall>,
    )

    await flushPromises()
    container.update()

    expect(children).toHaveBeenLastCalledWith({ hasResult: true, result: 42 })

    expect(container.children().exists()).toBe(true)
    const resultStoreContainer = container.childAt(0)
    expect(resultStoreContainer).toBeDefined()
    expect(resultStoreContainer).not.toHaveEmptyRender()
    expect(resultStoreContainer.children().exists()).toBe(true)
    expect(resultStoreContainer.childAt(0).text()).toBe('result')

    done()
  })

  it('should not call reducer if promise has been called the first time', async done => {
    const AsyncCall = createAsyncCallComponent(() => Promise.resolve(42))
    const children = jest.fn(value => <div>result</div>)
    const reducer = jest.fn(() => void 0)
    const container = mount(
      <AsyncCall params={{}}>
        <AsyncCall.ResultStore reduce={reducer}>{children}</AsyncCall.ResultStore>
      </AsyncCall>,
    )

    await flushPromises()
    expect(reducer).not.toHaveBeenCalled()

    done()
  })

  it('should call reducer callback if promise has been called the second time', async done => {
    const AsyncCall = createAsyncCallComponent(value => Promise.resolve(value))
    const children = jest.fn(value => <div>result</div>)
    const reducer = jest.fn(() => void 0)
    const container = mount(
      <AsyncCall params={1}>
        <AsyncCall.ResultStore reduce={reducer}>{children}</AsyncCall.ResultStore>
      </AsyncCall>,
    )

    await flushPromises()
    container.setProps({ params: 2 })
    await flushPromises()
    container.update()

    expect(reducer).toHaveBeenCalledTimes(1)
    expect(reducer).toHaveBeenCalledWith(1, 2)

    done()
  })

  it('should pass returning value of render callback to a children function', async done => {
    const AsyncCall = createAsyncCallComponent(value => Promise.resolve(value))
    const children = jest.fn(({ result }) => <div>{result}</div>)
    const reducer = (prevResult, currentResult) => prevResult + currentResult
    const container = mount(
      <AsyncCall params={10}>
        <AsyncCall.ResultStore reduce={reducer}>{children}</AsyncCall.ResultStore>
      </AsyncCall>,
    )

    await flushPromises()
    container.setProps({ params: 32 })

    await flushPromises()
    expect(children).toHaveBeenLastCalledWith({ hasResult: true, result: 42 })

    done()
  })

  it('should not call callback function if promise has not been resolved yet', () => {
    const AsyncCall = createAsyncCallComponent(() => Promise.resolve())
    const callbackFn = jest.fn(() => void 0)
    mount(
      <AsyncCall params={{}}>
        <AsyncCall.ResultStore reduce={callbackFn}>{() => null}</AsyncCall.ResultStore>
      </AsyncCall>,
    )
    expect(callbackFn).not.toHaveBeenCalled()
  })

  it('should not call callback function if promise has been resolved only once', async done => {
    const AsyncCall = createAsyncCallComponent(() => Promise.resolve())
    const callbackFn = jest.fn(() => void 0)
    const container = mount(
      <AsyncCall params={{}}>
        <AsyncCall.ResultStore reduce={callbackFn}>{() => null}</AsyncCall.ResultStore>
      </AsyncCall>,
    )

    await flushPromises()
    container.update()

    expect(callbackFn).not.toHaveBeenCalled()

    done()
  })

  it('should call callback function once if promise has been resolved twice', async done => {
    const AsyncCall = createAsyncCallComponent(value => Promise.resolve(value))
    const callbackFn = jest.fn(() => void 0)
    const container = mount(
      <AsyncCall params={1}>
        <AsyncCall.ResultStore reduce={callbackFn}>{() => null}</AsyncCall.ResultStore>
      </AsyncCall>,
    )

    await flushPromises()
    container.update()

    expect(callbackFn).not.toHaveBeenCalled()

    container.setProps({ params: 2 })
    await flushPromises()
    container.update()

    expect(callbackFn).toHaveBeenCalledWith(1, 2)
    done()
  })

  it('should pass result twice if promise has been resolved twice but no reduce callback was supplied', async done => {
    const children = jest.fn(({ result }) => <div>{result}</div>)
    const AsyncCall = createAsyncCallComponent(value => Promise.resolve(value))
    const container = mount(
      <AsyncCall params={1}>
        <AsyncCall.ResultStore>{children}</AsyncCall.ResultStore>
      </AsyncCall>,
    )

    await flushPromises()
    container.update()
    expect(children).toHaveBeenCalledWith({ result: 1, hasResult: true })

    container.setProps({ params: 2 })
    await flushPromises()
    container.update()
    expect(children).toHaveBeenCalledWith({ result: 2, hasResult: true })

    done()
  })

  describe('child context', () => {
    let rootContext
    let contextPropName
    const ContextChecker = (props, context) => {
      rootContext = context[contextPropName]
      return null
    }

    const prepareContextChecker = parent => {
      contextPropName = parent.contextPropName
      ContextChecker.contextTypes = {
        [contextPropName]: PropTypes.shape({}),
      }
    }

    afterEach(() => {
      rootContext = undefined
      contextPropName = undefined
    })

    it("should pass it's state to child context", () => {
      const AsyncCall = createAsyncCallComponent(() => Promise.resolve())
      prepareContextChecker(AsyncCall)

      const container = mount(
        <AsyncCall params={0}>
          <AsyncCall.ResultStore>
            <ContextChecker />
          </AsyncCall.ResultStore>
        </AsyncCall>,
      )
      expect(rootContext).toBeDefined()
      expect(rootContext.hasResult).toBe(false)
      expect(rootContext).not.toHaveProperty('result')
    })

    it('should pass result to child context if promise was resolved', async done => {
      const AsyncCall = createAsyncCallComponent(() => Promise.resolve(42))
      prepareContextChecker(AsyncCall)

      const container = mount(
        <AsyncCall params={0}>
          <AsyncCall.ResultStore reduce={() => void 0}>
            <ContextChecker />
          </AsyncCall.ResultStore>
        </AsyncCall>,
      )

      await flushPromises()
      expect(rootContext).toBeDefined()
      expect(rootContext.hasResult).toBe(true)
      expect(rootContext.result).toBe(42)

      done()
    })
  })
})
