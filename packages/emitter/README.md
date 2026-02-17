# @suckless/emitter

Type-safe event emitter. Zero dependencies, runtime-agnostic.

## Install

```sh
npm install @suckless/emitter
```

## Usage

```ts
import { createEmitter } from "@suckless/emitter"

type Events = {
	message: [string]
	error: [Error]
	connect: []
}

const emitter = createEmitter<Events>()

// Subscribe — returns an unsubscribe function
const off = emitter.on("message", (msg) => console.log(msg))

// Emit
emitter.emit("message", "hello")

// Unsubscribe
off()

// Fire once
emitter.once("connect", () => console.log("connected"))
```

## How it works

Event names and argument types are enforced at compile time through a generic event map. Each event maps to a tuple of arguments, giving you full autocomplete and type checking on both `emit` and listener parameters.

Listeners are stored in insertion-order Sets. Emit iterates a snapshot, so adding or removing listeners during emission is safe.

## API

### `createEmitter<E>(): Emitter<E>`

Creates a new emitter. `E` is a record mapping event names to argument tuples.

### `emitter.on(event, listener): () => void`

Subscribes to an event. Returns an unsubscribe function.

### `emitter.once(event, listener): () => void`

Like `on`, but the listener fires at most once. Returns an unsubscribe function that can cancel before firing.

### `emitter.emit(event, ...args): void`

Fires all listeners for the event with the given arguments.

### Cleanup

The emitter implements `Disposable` for cleanup:

```ts
using emitter = createEmitter<Events>()
```

## License

MIT
