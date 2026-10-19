import React from 'react';
import type { ConfigForm } from '@deepseek-ai/dsh-client-ui-settings/client';
export declare const name = "dsh-notify-client";
export declare const inject: readonly ["slots", "configForms"];
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
    configForms: {
        get<T>(entryId: string): ConfigForm<T>;
    };
}
export {};
//# sourceMappingURL=index.d.ts.map