// The active surprise result file, picked by dataFlag.js. Every component
// reads it through tabs/ai/surprise.js (or this module's default export);
// none imports a surprise20xx.json directly. A test that needs a fixture
// mocks this module: vi.doMock('@/lib/activeData.js', () => ({ default: f })).
import S2028 from '@/data/surprise2028.json';
import S2027 from '@/data/surprise2027.json';
import { DATA_SET } from '@/lib/dataFlag.js';

const FILES = { 2028: S2028, 2027: S2027 };
export default FILES[DATA_SET];
