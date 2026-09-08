import React from 'react';
import type { SettingsScope } from '@deepseek-ai/dsh-client-runtime/client';
export declare const name = "dsh-notify-client";
export declare const inject: readonly ["slots", "settingsScope"];
export declare function apply(ctx: ClientContext): void;
interface ClientContext {
    slots: {
        inject(key: string, factory: () => unknown): () => void;
        register(opts: {
            name: string;
            id: string;
            order?: number;
            label?: string;
            inject?: () => Record<string, unknown>;
        }, comp: React.FC<Record<string, unknown>>): () => void;
    };
    settingsScope: {
        bind<T>(spec: {
            namespace: string;
        }): SettingsScope<T>;
    };
}
export {};
//# sourceMappingURL=index.d.ts.map