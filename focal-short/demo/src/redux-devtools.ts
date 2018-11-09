import { Atom } from '@grammarly/focal'
import { createStore } from 'redux'

declare global {
  interface Window {
    __REDUX_DEVTOOLS_EXTENSION__?: () => undefined
  }
}

/**
 * Call this on your root state atom to enable Redux dev tools debugging.
 *
 * For example:
 *   const state = Atom.create(initialState)
 *   connectRedux(state) // <- this line enables redux devtools
 */
export function connectRedux<T>(atom: Atom<T>) {
  const store = createStore(
    (_: T, action: { type: '@@ATOM_UPDATE'; newState: T }) => {
      return action.newState
    },
    // @TODO hitting this issue here https://github.com/Microsoft/TypeScript/issues/21592
    // `as any` is a temporary fix until it's fixed in TS
    atom.get() as any,
    window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__()
  )

  let dispatch = true
  let setAtom = true

  const atomSub = atom.subscribe(x => {
    if (dispatch) {
      setAtom = false
      store.dispatch({ type: '@@ATOM_UPDATE', newState: x })
      setAtom = true
    }
  })

  const storeSub = store.subscribe(() => {
    if (setAtom) {
      dispatch = false
      // @TODO why do we get an undefined state here if you click commit right after
      // the store was initialized?
      atom.modify(x => (store.getState() !== undefined ? store.getState() : x))
      dispatch = true
    }
  })

  return {
    store,
    unsubscribe() {
      atomSub.unsubscribe()
      storeSub()
    }
  }
}
