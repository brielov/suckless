# @suckless/cron

Cron expression parser with next/prev schedule computation. ~540 lines, zero dependencies, runtime-agnostic.

## Install

```sh
npm install @suckless/cron
```

## Usage

```ts
import { parse, next, prev, matches, sequence } from "@suckless/cron"

const cron = parse("*/15 9-17 * * MON-FRI")

next(cron) // next occurrence from now
next(cron, someDate) // next occurrence after someDate
prev(cron) // previous occurrence from now
matches(cron, someDate) // true if someDate matches the expression
```

## Expression Format

Supports standard 5-field and extended 6-field (with seconds) formats:

```
┌───────────── second (0-59, optional)
│ ┌───────────── minute (0-59)
│ │ ┌───────────── hour (0-23)
│ │ │ ┌───────────── day of month (1-31)
│ │ │ │ ┌───────────── month (1-12 or JAN-DEC)
│ │ │ │ │ ┌───────────── day of week (0-7 or SUN-SAT, 0 and 7 are Sunday)
│ │ │ │ │ │
* * * * * *    (6-field)
* * * * *      (5-field, seconds default to 0)
```

### Supported syntax

| Syntax     | Example      | Description                              |
| ---------- | ------------ | ---------------------------------------- |
| `*`        | `* * * * *`  | Every possible value                     |
| Value      | `30 * * * *` | Specific value                           |
| Range      | `9-17`       | Inclusive range                          |
| Step       | `*/5`        | Every N values                           |
| Range+Step | `10-30/2`    | Every 2nd value from 10 through 30       |
| Start+Step | `6/23`       | Every 23rd value starting from 6         |
| List       | `1,5,10,15`  | Multiple values                          |
| Names      | `MON-FRI`    | Named months and days (case-insensitive) |

Named values: `JAN`-`DEC` for months, `SUN`-`SAT` for days of week.

Day-of-week `7` is normalized to `0` (both mean Sunday). Expressions like `6-7`, `6,0`, `0,6`, and `7,6` are all equivalent (Saturday and Sunday).

### Day-of-month and day-of-week (AND semantics)

When both day-of-month and day-of-week are specified, a date must match **both** constraints. For example, `0 0 15 * 3` matches only when the 15th falls on a Wednesday.

## API

### `parse(expression)`

Parses a cron expression string into a `CronExpression`. Throws `SyntaxError` on invalid input.

```ts
const cron = parse("30 9 * * MON-FRI")
```

### `CronExpression`

The parsed representation. Each field is a `ReadonlySet<number>` containing the matched values:

```ts
interface CronExpression {
	readonly seconds: ReadonlySet<number>
	readonly minutes: ReadonlySet<number>
	readonly hours: ReadonlySet<number>
	readonly daysOfMonth: ReadonlySet<number>
	readonly months: ReadonlySet<number>
	readonly daysOfWeek: ReadonlySet<number>
}
```

### `next(cron, from?)`

Returns the next `Date` that matches the expression, strictly after `from` (defaults to now). Throws `RangeError` if no match is found within a 5-year search window.

```ts
next(cron) // from now
next(cron, new Date("2026-06-15T12:00:00")) // from a specific date
```

### `prev(cron, from?)`

Returns the previous `Date` that matches the expression, strictly before `from` (defaults to now). Throws `RangeError` if no match is found within a 5-year search window.

```ts
prev(cron) // from now
prev(cron, new Date("2026-06-15T12:00:00")) // from a specific date
```

### `matches(cron, date)`

Returns `true` if the given `Date` matches the expression.

```ts
matches(cron, new Date()) // true or false
```

### `sequence(cron, from?)`

Returns an infinite generator yielding successive matching dates. Unlike `next`, the first yielded date can equal `from` if it matches the expression.

```ts
const gen = sequence(cron, new Date("2026-01-01"))

for (const date of gen) {
	console.log(date)
	if (someCondition) break
}
```

## Behavior

- `next` and `prev` never return `from` itself — they always advance or retreat by at least one second.
- `sequence` can yield `from` if it matches, then yields strictly increasing dates after that.
- Milliseconds are always zeroed in returned dates.
- Invalid dates like February 30 will never be returned. Expressions that can never match (e.g., `0 0 31 4 *` — April 31st) throw `RangeError`.
- Leap years are handled correctly. A `29 2` schedule will find the next February 29th.

## License

MIT
