// The active surprise result file, picked by dataFlag.js. Every component
// reads it through tabs/ai/surprise.js (or this module's default export);
// none imports a surprise20xx.json directly. A test that needs a fixture
// mocks this module: vi.doMock('@/lib/activeData.js', () => ({ default: f })).
// The 2027 file is not in the tree (R4-16): `ugai-surprise2027` is it only
// with NEXT_PUBLIC_DATA=2027 and the file present (data2027.mjs), else null.
import S2028 from '@/data/surprise2028.json';
import S2027 from 'ugai-surprise2027';
import { DATA_SET } from '@/lib/dataFlag.js';

const FILES = { 2028: S2028, 2027: S2027 };
if (!FILES[DATA_SET]) throw new Error(`NEXT_PUBLIC_DATA=${DATA_SET}: surprise${DATA_SET}.json is not available (set UGAI_SURPRISE2027; see data2027.mjs)`);
export default FILES[DATA_SET];
