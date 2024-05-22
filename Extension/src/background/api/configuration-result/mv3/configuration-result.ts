// FIXME should this be saved in the storage or not?

// FIXME docs
import { ConfigurationResult } from '@adguard/tswebextension/dist/types/src/lib/mv3/background';

export class ConfigurationResultApi {
    result: ConfigurationResult | null = null;

    // FIXME
    // @ts-ignore
    set(result: ConfigurationResult) {
        this.result = result;
    }

    // FIXME docs
    get() {
        return this.result;
    }
}

export const configurationResultApi = new ConfigurationResultApi();
