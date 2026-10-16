import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

describe('Frontend Test Example', () => {
    it('vitest should work correctly', () => {
        expect(1 + 1).toBe(2);
    });

    it('should be able to render a simple component', () => {
        render(<div>Hola Mundo</div>);
        expect(screen.getByText('Hola Mundo')).toBeInTheDocument();
    });
});
