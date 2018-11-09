import * as React from 'react'
import { render } from 'react-dom'
import { Atom, F, bind } from '@grammarly/focal'
import { connectRedux } from './redux-devtools'
import { Observable } from 'rxjs'

const initialState = {
  one: { count1: 0, count2: 0 },
  two: { count1: 0, count2: 0 },
  search: { searchTerm: '' }
}

type AppState = typeof initialState

// the counter component
const Counter = (props: { count: Atom<number> }) => (
  // note how we use the F component namespace. these F components will
  // allow us to seamlessly render observable values in JSX markup
  <F.div>
    Value: {props.count} <button onClick={() => props.count.modify(x => x + 1)}>+</button>
    <button onClick={() => props.count.modify(x => x - 1)}>-</button>
  </F.div>
)

const Counters = (props: { state: Atom<{ count1: number; count2: number }> }) => (
  <div>
    Here's a pair of counters:
    <Counter count={props.state.lens('count1')} />
    <Counter count={props.state.lens('count2')} />
  </div>
)

function searchGifs(query: string, limit = 5) {
  return fetch(
    `http://api.giphy.com/v1/gifs/search?q=${encodeURIComponent(query)}&api_key=dc6zaTOxFJmzC`
  )
    .then(r => r.json())
    .then((json: { data: { images: { fixed_height_small: { url: string } } }[] }) =>
      json.data.slice(0, limit).map(i => i.images.fixed_height_small.url)
    )
}

const InstantSearch = (props: { state: Atom<{ searchTerm: string }> }) => {
  const searchTerm = props.state.lens('searchTerm')

  const search = (query: string): Observable<{ urls?: string[]; error?: any }> => {
    if (query.trim().length === 0) return Observable.of({ error: 'Enter search query!' })

    return Observable.fromPromise(searchGifs(query))
      .map(urls => ({ urls: urls }))
      .startWith({})
  }

  return (
    <div>
      <F.input type="search" {...bind({ value: searchTerm })} />
      <p>Search results:</p>
      <F.div>
        {searchTerm
          .debounceTime(500)
          .distinctUntilChanged()
          .startWith('')
          .switchMap(q => search(q))
          .map(res => {
            if (res.error) {
              return <p key="error">Error: {res.error}</p>
            } else if (res.urls) {
              if (res.urls.length > 0) {
                return (
                  <div key="results">
                    {res.urls.map(url => (
                      <img key={url} src={url} style={{ margin: '3px', height: '100px' }} />
                    ))}
                  </div>
                )
              } else {
                return <p key="noresults">Nothing found.</p>
              }
            } else {
              return <p key="working">Working...</p>
            }
          })}
      </F.div>
    </div>
  )
}

// the root app component
const App = (props: { state: Atom<AppState> }) => (
  <F.div>
    Hello, TypeScript SF! The time is:{' '}
    {Observable.interval(1000)
      .startWith(0)
      .map(_ => new Date().toISOString())}
    <Counters state={props.state.lens('one')} />
    <Counters state={props.state.lens('two')} />
    <InstantSearch state={props.state.lens('search')} />
  </F.div>
)

// create the app state atom (a.k.a. the state store)
// we also immediately populate it with the initial state value
const appState = Atom.create(initialState)

// connect redux dev tools
connectRedux(appState)

// render the app
render(<App state={appState} />, document.getElementById('root'))
