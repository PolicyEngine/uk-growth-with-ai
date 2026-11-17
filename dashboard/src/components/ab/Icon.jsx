import {
  Wallet, House, Factory, ShoppingCart, Construction, Users, Clock, Percent, ChartPie, Receipt, Cpu, ArrowLeftRight, Globe, Lock,
  ArrowRight, ArrowUp, ArrowDown, Minus, Terminal, Github, Download, KeyRound, CalendarDays, FileText, FlaskConical, History, Gauge,
  Target, Shuffle, Sigma, TrendingUp, Landmark, UsersRound, BookOpen, Scale, Code, SlidersHorizontal, Layers, ChartColumn, Banknote,
  Briefcase, Building2, Info, TriangleAlert, Zap, Flag, Database, Package, GitBranch, Play, Repeat, LayoutGrid, Ruler, ExternalLink,
  List, Scissors, ChevronDown, X, Link2, HeartHandshake, Hourglass, ChartLine, Library, Compass, Table2, ListTree, PiggyBank, Baby,
  TrendingDown, Eye, Bot, Coins, PoundSterling, Activity, Lightbulb, UserMinus, UserCheck, HandCoins, Split, CircleHelp, EyeOff, Ban,
  ShoppingBasket, Boxes, HeartPulse, Gem, Gift, Sun, Sprout, Grid3x3, ClipboardList, DoorOpen, BookOpenText, Pin, IdCard,
  Workflow, Equal, CalendarClock, Calculator, Network, Microscope, ArrowUpRight, ArrowDownRight, Sparkles,
  UserX, UserSearch, Pause, RotateCcw, Crosshair, Waves, Droplets, GraduationCap, Truck, Hammer, Stethoscope, Laptop, Store, Wrench, Heart, ShieldCheck, MapPin, Timer, Plus, ChartArea, ChartNoAxesColumn, Blocks, MoveRight, Combine, Hand, Footprints, Signpost, Milestone, ChartSpline, ChartScatter, MousePointerClick, Shapes, Merge, Rows3, Columns3, Dot, TrendingUpDown,
  MessageCircleQuestion, Bookmark, ListChecks, Share2, Copy, ImageDown, CalendarCheck, FileCode, MoveVertical, MoveHorizontal,
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
  basket: ShoppingBasket, boxes: Boxes, heartPulse: HeartPulse, gem: Gem, gift: Gift, sun: Sun, sprout: Sprout,
  grid3: Grid3x3, clipboard: ClipboardList, door: DoorOpen, bookText: BookOpenText, pin: Pin, idCard: IdCard,
  trendDown: TrendingDown, eye: Eye, bot: Bot, coins: Coins, pound: PoundSterling, activity: Activity, lightbulb: Lightbulb,
  userMinus: UserMinus, userCheck: UserCheck, handCoins: HandCoins, split: Split, help: CircleHelp, eyeOff: EyeOff, ban: Ban,
  workflow: Workflow, equal: Equal, calendarClock: CalendarClock, calculator: Calculator, network: Network,
  microscope: Microscope, arrowUpRight: ArrowUpRight, arrowDownRight: ArrowDownRight, sparkles: Sparkles,
  // wave 2: chart controls and spare keys for the part builders (concepts pick from these)
  userX: UserX, userSearch: UserSearch, pause: Pause, replay: RotateCcw, crosshair: Crosshair, waves: Waves, droplets: Droplets, graduation: GraduationCap, truck: Truck, hammer: Hammer, stethoscope: Stethoscope, laptop: Laptop, store: Store, wrench: Wrench, heart: Heart, shield: ShieldCheck, mapPin: MapPin, timer: Timer, plus: Plus, grid: Grid3x3, chartArea: ChartArea, chartBars: ChartNoAxesColumn, blocks: Blocks, moveRight: MoveRight, combine: Combine, hand: Hand, footprints: Footprints, signpost: Signpost, milestone: Milestone, chartSpline: ChartSpline, chartScatter: ChartScatter, pointer: MousePointerClick, shapes: Shapes, merge: Merge, rows: Rows3, columns: Columns3, dot: Dot, trendUpDown: TrendingUpDown,
  // push 2h (shell): topic openers, recap, chart actions, the as-of stamp
  question: MessageCircleQuestion, bookmark: Bookmark, listChecks: ListChecks, share: Share2, copy: Copy, imageDown: ImageDown, calendarCheck: CalendarCheck, fileCode: FileCode, moveVertical: MoveVertical, moveHorizontal: MoveHorizontal,
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
