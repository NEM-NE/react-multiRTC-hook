export function bindTrailingArgs(fn, ...boundArgs) {
    return function (...args) {
      return fn(...args, ...boundArgs);
    };
}