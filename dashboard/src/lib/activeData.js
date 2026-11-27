// The active surprise result file, picked by dataFlag.js. Every component
// reads it through tabs/ai/surprise.js (or this module's default export);
// none imports a surprise20xx.json directly. A test that needs a fixture
// mocks this module: vi.doMock('@/lib/activeData.js', () => ({ default: f })).
// Each set's file is in the bundle only when that set is active: the
// `ugai-surprise2027` and `ugai-surprise2028` aliases resolve to null stubs
// otherwise (data2027.mjs; R4-16, dashboard review D8).
import S2028 from 'ugai-surprise2028';
import S2027 from 'ugai-surprise2027';
import { DATA_SET } from '@/lib/dataFlag.js';

const FILES = { 2028: S2028, 2027: S2027 };
if (!FILES[DATA_SET]) throw new Error(`NEXT_PUBLIC_DATA=${DATA_SET}: surprise${DATA_SET}.json is not available (set UGAI_SURPRISE2027; see data2027.mjs)`);
export default FILES[DATA_SET];
