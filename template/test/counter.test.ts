import { forall, assert, nat, Options } from 'jsverify';
import { diagramArbitrary, withTime, addPrevState } from 'cyclejs-test-helpers';
import onionify from 'cycle-onionify';
const htmlLooksLike = require('html-looks-like');
const toHtml = require('snabbdom-to-html'); //snabbdom-to-html's typings are broken

import xs, { Stream } from 'xstream';
import { mockDOMSource, VNode } from '@cycle/dom';
import { mockTimeSource } from '@cycle/time';

import { Counter, defaultState } from '../src/components/counter';

const testOptions: Options = {
    tests: 10,
    size: 200
};

export const expectedHTML = (count: any) => `
    <div>
        <h2>My Awesome Cycle.js app - Page 1</h2>
        <span>Counter: ${count}</span>
        <button>Increase</button>
        <button>Decrease</button>
        <button>Page 2</button>
    </div>
`;

const createTest = (usePrev: boolean) => () => {
    const property = forall(
        diagramArbitrary,
        diagramArbitrary,
        nat,
        (addDiagram, subtractDiagram, count) =>
            withTime(Time => {
                const add$ = Time.diagram(addDiagram);
                const subtract$ = Time.diagram(subtractDiagram);

                const DOM = mockDOMSource({
                    '.add': { click: add$ },
                    '.subtract': { click: subtract$ }
                });

                const state = usePrev ? { count } : { count: undefined };
                const app: any = onionify(addPrevState(Counter, state))(
                    { DOM } as any
                );
                const html$ = (app.DOM as Stream<VNode>).map(toHtml);

                const expected$ = xs
                    .merge(add$.mapTo(+1), subtract$.mapTo(-1))
                    .fold(
                        (acc, curr) => acc + curr,
                        usePrev ? count : defaultState.count
                    )
                    .map(expectedHTML);

                Time.assertEqual(html$, expected$, htmlLooksLike);
            })
    );

    return assert(property, testOptions);
};

describe('app tests', () => {
    it('counter should work without prevState', createTest(true));

    it('counter should work with prevState', createTest(false));

    it('counter should navigate', () => {
        const property = forall(diagramArbitrary, clickDiagram =>
            withTime(Time => {
                const click$ = Time.diagram(clickDiagram);

                const DOM = mockDOMSource({
                    '[data-action="navigate"]': { click: click$ }
                });

                const app = onionify(Counter)({ DOM } as any);
                const router$ = app.router as Stream<string>;

                const expected$ = click$.mapTo('/p2');

                Time.assertEqual(router$, expected$, htmlLooksLike);
            })
        );

        return assert(property, testOptions);
    });
});
