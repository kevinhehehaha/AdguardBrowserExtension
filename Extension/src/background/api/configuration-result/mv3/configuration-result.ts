// FIXME should this be saved in the storage or not?

// FIXME docs
import { type ConfigurationResult } from '@adguard/tswebextension/mv3';

/**
 *
 */
export class ConfigurationResultApi {
    result: ConfigurationResult | null = null;

    /**
     *
     * @param result
     */
    // FIXME
    // @ts-ignore
    set(result: ConfigurationResult) {
        this.result = result;
    }

    /**
     *
     */
    // FIXME docs
    get() {
        return this.result;
    }
}

export const configurationResultApi = new ConfigurationResultApi();
