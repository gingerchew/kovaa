import { describe, it, expect } from 'vitest';
import { createApp } from '../src/index';

describe('@createApp', () => {
    it('should fail if the passed object is invalid', () => {
        // @ts-expect-error
        expect(createApp('test')).toThrowError('App definition must be an object');
        // @ts-expect-error
        expect(createApp(0)).toThrowError('App definition must be an object');
        expect(createApp({})).toHaveProperty('mount');
    });
})