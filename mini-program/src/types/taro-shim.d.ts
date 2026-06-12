declare function defineAppConfig<T extends Record<string, unknown>>(config: T): T;
declare function definePageConfig<T extends Record<string, unknown>>(config: T): T;

declare module "*.scss";

declare module "@tarojs/components" {
  import type { ComponentType, ReactNode } from "react";

  export const View: ComponentType<Record<string, unknown>>;
  export const Text: ComponentType<Record<string, unknown>>;
  export const ScrollView: ComponentType<
    Record<string, unknown> & {
      scrollX?: boolean;
      scrollY?: boolean;
      children?: ReactNode;
    }
  >;
  export const RichText: ComponentType<
    Record<string, unknown> & {
      nodes?: unknown;
    }
  >;
}
