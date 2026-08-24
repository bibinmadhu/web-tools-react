/**
 * Essential browser polyfills for PDF.js and Modern Web APIs
 * Resolves "undefined is not a function (near '...value of readableStream...')"
 * across Safari, iOS WebKit, Chrome, Firefox, Node, and iframe sandboxes.
 */

if (typeof window !== 'undefined' || typeof globalThis !== 'undefined') {
  const g: any = typeof window !== 'undefined' ? window : globalThis;

  // 1. ReadableStream async iterator & .values() polyfill
  // Crucial for pdfjs-dist in Safari / WebKit and browsers lacking ReadableStream async iteration
  if (typeof g.ReadableStream !== 'undefined') {
    if (!g.ReadableStream.prototype[Symbol.asyncIterator]) {
      g.ReadableStream.prototype[Symbol.asyncIterator] = async function* () {
        const reader = this.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) return;
            yield value;
          }
        } finally {
          reader.releaseLock();
        }
      };
    }

    if (typeof g.ReadableStream.prototype.values !== 'function') {
      g.ReadableStream.prototype.values = function () {
        if (typeof this[Symbol.asyncIterator] === 'function') {
          return this[Symbol.asyncIterator]();
        }
        return (async function* (stream) {
          const reader = stream.getReader();
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) return;
              yield value;
            }
          } finally {
            reader.releaseLock();
          }
        })(this);
      };
    }
  }

  // 2. Promise.withResolvers polyfill
  if (typeof Promise !== 'undefined' && typeof (Promise as any).withResolvers !== 'function') {
    (Promise as any).withResolvers = function () {
      let resolve: any, reject: any;
      const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return { promise, resolve, reject };
    };
  }

  // 3. Object.hasOwn polyfill
  if (typeof Object.hasOwn !== 'function') {
    Object.hasOwn = function (object: any, key: PropertyKey): boolean {
      return Object.prototype.hasOwnProperty.call(object, key);
    };
  }

  // 4. Array.prototype.at polyfill
  if (typeof Array.prototype.at !== 'function') {
    Array.prototype.at = function (n: number) {
      n = Math.trunc(n) || 0;
      if (n < 0) n += this.length;
      if (n < 0 || n >= this.length) return undefined;
      return this[n];
    };
  }
}

export {};
