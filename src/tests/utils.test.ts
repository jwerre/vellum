import { describe, it, expect } from 'vitest';
import { utils } from '../lib/index.js';

describe('Utilities', () => {
	describe('escapeHTML()', () => {
		it('should escape all sensitive HTML characters', () => {
			const input = '<script src="test.js">alert("Hello & Welcome!");</script>';
			const expected =
				'&lt;script src=&quot;test.js&quot;&gt;alert(&quot;Hello &amp; Welcome!&quot;);&lt;/script&gt;';

			expect(utils.escapeHTML(input)).toBe(expected);
		});

		it('should escape ampersands', () => {
			expect(utils.escapeHTML('Fish & Chips')).toBe('Fish &amp; Chips');
		});

		it('should escape less than and greater than symbols', () => {
			expect(utils.escapeHTML('5 < 10 > 2')).toBe('5 &lt; 10 &gt; 2');
		});

		it('should escape double and single quotes', () => {
			expect(utils.escapeHTML('It\'s "important"')).toBe('It&#39;s &quot;important&quot;');
		});

		it('should return an empty string when input is empty', () => {
			expect(utils.escapeHTML('')).toBe('');
		});

		it('should not change strings that do not contain special characters', () => {
			const plainText = 'Hello World 123';
			expect(utils.escapeHTML(plainText)).toBe(plainText);
		});
	});
});
