import * as React from 'react'
import * as PropTypes from 'prop-types'
import invariant from 'fbjs/lib/invariant'
import { isFunction, resultStoreContextPropType, resultStoreContextPropName } from './common'
import { createHasResult } from './HasResult'
import { createResetter } from './Resetter'

export const createResultStore = (contextPropName, rootDisplayName) => {
  /**
   * Type of `children` function of a {@link AsyncCall.ResultStore} component.
   * @function ResultStoreChildrenFunction
   * @param {object} params
   * @param {boolean} params.hasResult
   * @param {any=} params.result
   * @param {ResetFunction} params.reset Function for manual store cleaning.
   * @returns {ReactNode} Should return rendered React component(s) depending on supplied params.
   * @remark type definition
   */

  /**
   * Type of `reduce` property of a {@link AsyncCall.ResultStore} component.
   * @function ReduceFunction
   * @param {any} previousResult
   * @param {any} currentResult
   * @returns {any}
   * @remark type definition
   */

  /**
   * @class
   * @classdesc
   * React Component. Implements store of results of sequential async calls.
   * Useful when you need to accumulate results of async calls (e.g., to glue together sequential calls of server API).
   * @example
   * ```jsx
   * const concatResults = (previousResult, currentResult) => [...previousResult, ...currentResult]
   *
   * ...
   *
   * <AsyncCall params={{ page: this.state.page }}>
   *   <AsyncCall.ResultStore reduce={concatResults} reset={this.state.page === 0}>
   *     <AsyncCall.ResultStore.HasResult>
   *       {({ result }) => <pre>{JSON.stringify(result)}</pre>}
   *     </AsyncCall.ResultStore.HasResult>
   *   </AsyncCall.ResultStore>
   *   <button onClick={() => this.setState(({ page }) => ({ page: page + 1}))}>
   *     Load more
   *   </button>
   *   <button onClick={() => this.setState({ page: 0 })}>
   *     Reload
   *   </button>
   * </AsyncCall>
   * ```
   * @property {ResultStoreChildrenFunction | ReactNode} children React children or function that returns rendered result
   * depending on `hasResult` flag and `result`.
   * @property {ReduceFunction} reduce Function from previousResult and currentResult to a new result.
   * Useful, for example, when you need to accumulate sequential async calls
   * (e.g. for fetching data for infinte page scroll).
   * @property {any=} initialValue Optional initial value for the result store. If value is provided, result store will have result always.
   * @property {boolean} [reset=false] @deprecated If `true`, clears the store (**Deprecated, will be removed in version 1.0.0. Use {@link AsyncCall.ResultStore.Resetter} instead**).
   * @static
   * @extends {React.Component}
   * @memberof AsyncCall
   */
  class ResultStore extends React.Component {
    static childContextTypes = {
      [contextPropName]: resultStoreContextPropType,
    }

    static contextTypes = {
      [contextPropName]: PropTypes.shape({
        resolved: PropTypes.bool,
        result: PropTypes.any,
      }),
    }

    static propTypes = {
      children: PropTypes.oneOfType([PropTypes.func, PropTypes.node]).isRequired,
      reduce: PropTypes.func,
      reset: PropTypes.bool,
      initialValue: PropTypes.any,
    }

    static defaultProps = {
      reduce: (_, value) => value,
    }

    static displayName = `${rootDisplayName}.ResultStore`

    static HasResult = createHasResult(contextPropName, ResultStore.displayName)
    static Resetter = createResetter(contextPropName, ResultStore.displayName)

    state = {
      hasResult: false,
    }

    getChildContext() {
      return {
        [contextPropName]: {
          [resultStoreContextPropName]: this._getState(),
        },
      }
    }

    componentDidMount() {
      const contextProps = this.context[contextPropName]

      if (contextProps.resolved || this.props.hasOwnProperty('initialValue')) {
        this.setState({
          hasResult: true,
          result: contextProps.resolved ? contextProps.result : this.props.initialValue,
        })
      }
    }

    componentWillReceiveProps(nextProps, nextContext) {
      if (nextProps.reset) {
        this.reset()
      }

      if (nextContext[contextPropName].resolved && !this.context[contextPropName].resolved) {
        this.setState(
          prevState =>
            prevState.hasResult
              ? {
                  result: this.props.reduce(prevState.result, nextContext[contextPropName].result),
                }
              : { hasResult: true, result: nextContext[contextPropName].result },
        )
      }
    }

    render() {
      invariant(
        this.context[contextPropName],
        `<${ResultStore.displayName}> must be a child (direct or indirect) of <${rootDisplayName}>.`,
      )

      return (isFunction(this.props.children) ? this.props.children(this._getState()) : this.props.children) || null
    }

    _getState() {
      const result = this.state.hasResult ? { result: this.state.result } : {}
      return {
        hasResult: this.state.hasResult,
        reset: this.reset,
        ...result,
      }
    }

    /**
     * Resets result store to its intial state.
     * @method
     * @param {bool} [execute=false] Wether execute promise-returning function after resetting or not.
     */
    reset = execute => {
      this.setState(
        this.props.hasOwnProperty('initialValue')
          ? { hasResult: true, result: this.props.initialValue }
          : {
              hasResult: false,
            },
      )
      if (execute) {
        this.context[contextPropName].execute()
      }
    }
  }

  return ResultStore
}
