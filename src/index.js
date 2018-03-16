import * as React from 'react'
import * as PropTypes from 'prop-types'
import shallowEqual from 'fbjs/lib/shallowEqual'
import invariant from 'fbjs/lib/invariant'

const isFunction = value => !!(value && value.constructor && value.call && value.apply)

let counter = 1

export const createPromiseRenderer = fn => {
  const contextPropName = `__react-promise-renderer__${counter++}`

  class Running extends React.Component {
    static contextTypes = {
      [contextPropName]: PropTypes.shape({
        running: PropTypes.bool,
      }),
    }

    state = {
      running: this.context[contextPropName].running,
    }

    componentWillReceiveProps(_, nextContext) {
      if (this.state.running !== nextContext[contextPropName].running) {
        this.setState({
          running: nextContext[contextPropName].running,
        })
      }
    }

    shouldComponentUpdate(_, nextState, nextContext) {
      return nextContext[contextPropName].running !== this.state.running
    }

    render() {
      return this.state.running ? this.props.children : null
    }
  }

  class Resolved extends React.Component {
    static contextTypes = {
      [contextPropName]: PropTypes.shape({
        running: PropTypes.bool,
        rejected: PropTypes.bool,
        result: PropTypes.any,
      }),
    }

    state = {
      resolved: !this.context[contextPropName].running && !this.context[contextPropName].rejected,
      result: this.context[contextPropName].result,
    }

    componentWillReceiveProps(_, nextContext) {
      if (
        this.state.resolved !== (!nextContext[contextPropName].running && !nextContext[contextPropName].rejected) ||
        this.state.result !== nextContext[contextPropName].result
      ) {
        this.setState({
          resolved: !nextContext[contextPropName].running && !nextContext[contextPropName].rejected,
          result: nextContext[contextPropName].result,
        })
      }
    }

    shouldComponentUpdate(_, nextState, nextContext) {
      return (
        (!nextContext[contextPropName].running && !nextContext[contextPropName].rejected !== this.state.resolved) ||
        nextContext[contextPropName].result !== this.state.result
      )
    }

    render() {
      return this.state.resolved
        ? isFunction(this.props.children) ? this.props.children(this.state.result) : this.props.children
        : null
    }
  }

  class Rejected extends React.Component {
    static contextTypes = {
      [contextPropName]: PropTypes.shape({
        rejected: PropTypes.bool,
        rejectReason: PropTypes.any,
      }),
    }

    state = {
      rejected: this.context[contextPropName].rejected,
      rejectReason: this.context[contextPropName].rejectReason,
    }

    componentWillReceiveProps(_, nextContext) {
      if (
        nextContext[contextPropName].rejected !== this.state.rejected ||
        nextContext[contextPropName].rejectReason !== this.state.rejectReason
      ) {
        this.setState({
          rejected: nextContext[contextPropName].rejected,
          rejectReason: nextContext[contextPropName].rejectReason,
        })
      }
    }

    shouldComponentUpdate(_, nextState, nextContext) {
      return (
        nextContext[contextPropName].rejected !== this.state.rejected ||
        nextContext[contextPropName].rejectReason !== this.state.rejectReason
      )
    }

    render() {
      return this.state.rejected
        ? isFunction(this.props.children) ? this.props.children(this.state.rejectReason) : this.props.children
        : null
    }
  }

  return class extends React.Component {
    static childContextTypes = {
      [contextPropName]: PropTypes.shape({
        running: PropTypes.bool,
        rejected: PropTypes.bool,
        rejectReason: PropTypes.any,
        result: PropTypes.any,
      }),
    }

    static propTypes = {
      params: PropTypes.any.isRequired,
      mergeResult: PropTypes.func,
    }

    static defaultProps = {
      mergeResult: (_, currentResult) => currentResult,
    }

    static Running = Running
    static Resolved = Resolved
    static Rejected = Rejected

    state = {
      running: true,
      rejected: false,
    }

    getChildContext() {
      return {
        [contextPropName]: {
          ...this.state,
        },
      }
    }

    componentDidMount() {
      invariant(
        isFunction(fn),
        'Function should be passed to createPromiseRenderer as a first argument but got %s.',
        fn,
      )
      this.callQueryFunc(this.props.params)
    }

    componentWillReceiveProps(nextProps) {
      if (!shallowEqual(nextProps.params, this.props.params)) {
        this.callQueryFunc(nextProps.params)
      }
    }

    callQueryFunc = params => {
      this.setState({ running: true, rejected: false, rejectReason: undefined })
      fn(params)
        .then(value =>
          this.setState({
            running: false,
            rejected: false,
            result: this.state.result === undefined ? value : this.props.mergeResult(this.state.result, value),
          }),
        )
        .catch(reason => this.setState({ running: false, rejected: true, rejectReason: reason }))
    }

    render() {
      return (
        this.props.children !== undefined &&
        (isFunction(this.props.children)
          ? this.props.children({
              running: this.state.running,
              result: this.state.result,
              rejected: this.state.rejected,
              rejectReason: this.state.rejectReason,
            })
          : this.props.children)
      )
    }
  }
}

export default createPromiseRenderer
