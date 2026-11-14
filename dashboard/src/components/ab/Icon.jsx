import {
  Wallet, House, Factory, ShoppingCart, Construction, Users, Clock, Percent, ChartPie, Receipt, Cpu, ArrowLeftRight, Globe, Lock,
  ArrowRight, ArrowUp, ArrowDown, Minus, Terminal, Github, Download, KeyRound, CalendarDays, FileText, FlaskConical, History, Gauge,
  Target, Shuffle, Sigma, TrendingUp, Landmark, UsersRound, BookOpen, Scale, Code, SlidersHorizontal, Layers, ChartColumn, Banknote,
  Briefcase, Building2, Info, TriangleAlert, Zap, Flag, Database, Package, GitBranch, Play, Repeat, LayoutGrid, Ruler, ExternalLink,
  List, Scissors, ChevronDown, X, Link2, HeartHandshake, Hourglass, ChartLine, Library, Compass, Table2, ListTree, PiggyBank, Baby,
} from 'lucide-react';

// Every icon on the page: Lucide, drawn plain (no chip, circle or box round
// it), stroke 1.8, in the colour of the text beside it.
const ICONS = {
  wallet: Wallet, home: House, factory: Factory, cart: ShoppingCart, construction: Construction, users: Users, clock: Clock,
  percent: Percent, pie: ChartPie, receipt: Receipt, cpu: Cpu, arrowLeftRight: ArrowLeftRight, globe: Globe, lock: Lock,
  arrowRight: ArrowRight, arrowUp: ArrowUp, arrowDown: ArrowDown, minus: Minus, terminal: Terminal, github: Github,
  download: Download, key: KeyRound, calendar: CalendarDays, fileText: FileText, flask: FlaskConical, history: History,
  gauge: Gauge, target: Target, shuffle: Shuffle, sigma: Sigma, trend: TrendingUp, landmark: Landmark, usersRound: UsersRound,
  book: BookOpen, scale: Scale, code: Code, sliders: SlidersHorizontal, layers: Layers, bars: ChartColumn, banknote: Banknote,
  briefcase: Briefcase, building: Building2, info: Info, alert: TriangleAlert, zap: Zap, flag: Flag, database: Database,
  package: Package, gitBranch: GitBranch, play: Play, repeat: Repeat, layoutGrid: LayoutGrid, ruler: Ruler,
  externalLink: ExternalLink, list: List, scissors: Scissors, chevronDown: ChevronDown, x: X, link: Link2,
  handshake: HeartHandshake, hourglass: Hourglass, lineChart: ChartLine, library: Library, compass: Compass, table: Table2,
  listTree: ListTree, piggy: PiggyBank, baby: Baby,
};

export default function Icon({ name, size = 16, className, strokeWidth = 1.8 }) {
  const Glyph = ICONS[name];
  if (!Glyph) return null;
  return (
    <span className={className ?? 'plain-icon'} aria-hidden="true">
      <Glyph size={size} strokeWidth={strokeWidth} />
    </span>
  );
}
