import {providerContext} from './providerContext';

export function executeModule<T = any>(moduleCode: string, ...args: any[]): T {
  const context = {
    exports: {} as any,
    module: {exports: {} as any},
    require: () => ({}),
    console,
    Promise,
    __awaiter: (thisArg: any, _arguments: any, P: any, generator: any) => {
      function adopt(value: any) {
        return value instanceof P
          ? value
          : new P(function (resolve: any) {
              resolve(value);
            });
      }
      return new (P || (P = Promise))(function (resolve: any, reject: any) {
        function fulfilled(value: any) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }
        function rejected(value: any) {
          try {
            step(generator.throw(value));
          } catch (e) {
            reject(e);
          }
        }
        function step(result: any) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    },
    providerContext,
  } as any;

  const argNames = args.map((_, i) => `arg${i}`).join(', ');
  const fn = new Function(
    'context',
    ...args.map((_, i) => `arg${i}`),
    `const exports = context.exports; const module = context.module; const require = context.require; const providerContext = context.providerContext; const console = context.console; const Promise = context.Promise; ${moduleCode}; return module.exports && Object.keys(module.exports).length ? module.exports : exports;`,
  ) as any;
  return fn(context, ...args);
}


