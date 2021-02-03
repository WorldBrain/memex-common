import { aggregate } from "./memory"
import expect from "expect"

describe('Memory activity streams', () => {
    describe(`${aggregate.name}()`, () => {
        it('should handle the simple case', () => {
            const source = [
                { id: { objectId: 1}, group: { groupId: 'one' } },
                { id: { objectId: 2}, group: { groupId: 'two' } },
                { id: { objectId: 3}, group: { groupId: 'two' } },
                { id: { objectId: 4}, group: { groupId: 'three' } },
            ]
            const aggregated = aggregate(source, (obj) => obj.group, key => key.groupId)
            expect(aggregated).toEqual([
                { hash: 'one', key: source[0].group, items: [source[0]]},
                { hash: 'two', key: source[1].group, items: [source[1], source[2]] },
                { hash: 'three', key: source[3].group, items: [source[3]] },
            ])
        })
        it('should bump old groups to the end if new objects are found for an old group', () => {
            const source = [
                { id: { objectId: 1}, group: { groupId: 'one' } },
                { id: { objectId: 2}, group: { groupId: 'two' } },
                { id: { objectId: 3}, group: { groupId: 'two' } },
                { id: { objectId: 4}, group: { groupId: 'three' } },
                { id: { objectId: 5}, group: { groupId: 'two' } },
                { id: { objectId: 6}, group: { groupId: 'two' } },
                { id: { objectId: 7}, group: { groupId: 'three' } },
                { id: { objectId: 8}, group: { groupId: 'two' } },
            ]
            expect(aggregate(source.slice(0, 5), (obj) => obj.group, key => key.groupId)).toEqual([
                { hash: 'one', key: source[0].group, items: [source[0]] },
                { hash: 'three', key: source[3].group, items: [source[3]] },
                { hash: 'two', key: source[1].group, items: [source[1], source[2], source[4]] },
            ])
            expect(aggregate(source.slice(0, 6), (obj) => obj.group, key => key.groupId)).toEqual([
                { hash: 'one', key: source[0].group, items: [source[0]] },
                { hash: 'three', key: source[3].group, items: [source[3]] },
                { hash: 'two', key: source[1].group, items: [source[1], source[2], source[4], source[5]] },
            ])
            expect(aggregate(source.slice(0, 7), (obj) => obj.group, key => key.groupId)).toEqual([
                { hash: 'one', key: source[0].group, items: [source[0]] },
                { hash: 'two', key: source[1].group, items: [source[1], source[2], source[4], source[5]] },
                { hash: 'three', key: source[3].group, items: [source[3], source[6]] },
            ])
            expect(aggregate(source.slice(0, 8), (obj) => obj.group, key => key.groupId)).toEqual([
                { hash: 'one', key: source[0].group, items: [source[0]] },
                { hash: 'three', key: source[3].group, items: [source[3], source[6]] },
                { hash: 'two', key: source[1].group, items: [source[1], source[2], source[4], source[5], source[7]] },
            ])
        })
    })
})