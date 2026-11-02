import type { CSSProperties } from 'react'
import {
  Activity, Angry, Archive, ArrowLeft, ArrowRight, ArrowUpRight, BadgeCheck, Ban, Bed, BedDouble, BedSingle,
  Bell, BellOff, BellRing, Biohazard, BriefcaseMedical, Cable, Calendar, CalendarCheck, CalendarDays, CalendarRange,
  CalendarX, ChartLine, ChartPie, Check, CheckCheck, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Circle,
  CircleAlert, CircleCheck, CircleCheckBig, CircleHelp, CirclePause, CircleX, ClipboardCheck, ClipboardList,
  ClipboardPlus, Clock, CloudOff, DoorClosed, DoorOpen, Download, Droplet, Ellipsis, Eye, Fan, File, FileHeart, FileImage,
  FileSpreadsheet, FileText, FileUp, FlaskConical, FolderHeart, FolderOpen, Folders, Footprints, Frown, Funnel,
  Gavel, HeartPulse, History, Hospital, House, IdCard, Info, Laugh, LayoutDashboard, Link, List, ListChecks,
  ListFilter, ListTodo, LoaderCircle, Lock, LogIn, LogOut, Mail, MailWarning, Meh, MessageSquare, MessagesSquare,
  Mic, Microscope, NotebookPen, NotepadText, Paperclip, Pill, Plus, Printer, RefreshCw, RotateCcw, Rows3, Save,
  Presentation, SaveAll, Scissors, ScrollText, Search, SearchCheck, Settings, Shapes, Share, Sheet, Shield, ShieldCheck, ShieldPlus,
  Siren, Smile, SprayCan, SquarePen, SquareUser, Stethoscope, StickyNote, Syringe, Table, Timer, Toilet, Trash2,
  TriangleAlert, Undo2, User, UserCheck, Users, UsersRound, Utensils, UtensilsCrossed, Waypoints, Wind, X, Zap,
  type LucideIcon,
} from 'lucide-react'

/**
 * Icônes de l'application, dessinées avec lucide-react (même style que les autres
 * services du CHU, voir la consultation externe). Les noms sont ceux des anciennes
 * icônes Material Symbols, pour pouvoir les remplacer une à une sans toucher à la
 * logique. Taille 1em : les classes de taille de texte (text-xl…) restent valables.
 */
const ICONES: Record<string, LucideIcon> = {
  add: Plus, air: Wind, airline_seat_flat: BedSingle, arrow_back: ArrowLeft, arrow_forward: ArrowRight,
  assignment: ClipboardList, assignment_ind: SquareUser, assignment_turned_in: ClipboardCheck,
  attach_file: Paperclip, badge: IdCard, bed: Bed, biotech: Microscope, block: Ban, bloodtype: Droplet,
  bolt: Zap, calendar_month: CalendarDays, cancel: CircleX, category: Shapes, chat: MessageSquare,
  check: Check, check_circle: CircleCheck, checklist: ListChecks, chevron_left: ChevronLeft,
  chevron_right: ChevronRight, clinical_notes: NotebookPen, close: X, cloud_off: CloudOff,
  content_cut: Scissors, coronavirus: Biohazard, csv: FileSpreadsheet, delete: Trash2,
  description: FileText, directions_walk: Footprints, done_all: CheckCheck, door_front: DoorClosed,
  door_open: DoorOpen, download: Download, edit_note: SquarePen, emergency: Siren, error: CircleAlert,
  event: Calendar, event_available: CalendarCheck, event_busy: CalendarX, event_note: CalendarRange,
  exit_to_app: LogOut, expand_less: ChevronUp, expand_more: ChevronDown, fact_check: ClipboardCheck,
  fastfood: Utensils, filter_alt: Funnel, filter_list: ListFilter, folder_open: FolderOpen,
  folder_shared: Folders, folder_special: FolderHeart, forum: MessagesSquare, gavel: Gavel, group: Users,
  groups: Users, groups_2: UsersRound, health_and_safety: ShieldPlus, help: CircleHelp, history: History,
  history_edu: ScrollText, home: House, info: Info, input: LogIn, inventory_2: Archive, ios_share: Share,
  king_bed: BedDouble, link: Link, list_alt: List, local_hospital: Hospital, lock: Lock, logout: LogOut,
  mail: Mail, mark_email_unread: MailWarning, masks: Shield, medical_information: FileHeart,
  medical_services: BriefcaseMedical, medication: Pill, medication_liquid: FlaskConical,
  meeting_room: DoorOpen, monitor_heart: HeartPulse, monitoring: Activity, mood: Smile, more_horiz: Ellipsis,
  move_up: ArrowUpRight, no_food: UtensilsCrossed, note_alt: StickyNote, notifications: Bell,
  notifications_active: BellRing, notifications_off: BellOff, output: LogOut, pause_circle: CirclePause,
  person: User, person_check: UserCheck, picture_as_pdf: FileText, pie_chart: ChartPie, pill: Pill,
  prescriptions: ClipboardPlus, print: Printer, priority_high: TriangleAlert, progress_activity: LoaderCircle,
  radio_button_unchecked: Circle, record_voice_over: Mic, restart_alt: RotateCcw, restore: RotateCcw,
  rule: ListTodo, sanitizer: SprayCan, save: Save, save_as: SaveAll, schedule: Clock, search: Search,
  search_check: SearchCheck, sentiment_dissatisfied: Frown, sentiment_satisfied: Smile,
  sentiment_very_dissatisfied: Angry, sentiment_very_satisfied: Laugh, settings: Settings,
  settings_input_component: Cable, show_chart: ChartLine, space_dashboard: LayoutDashboard,
  stethoscope: Stethoscope, summarize: NotepadText, sync: RefreshCw, table_rows: Rows3, table_view: Table,
  task_alt: CircleCheckBig, timeline: Waypoints, timer_10_alt_1: Timer, undo: Undo2, upload_file: FileUp,
  vaccines: Syringe, ventilator: Fan, verified: BadgeCheck, verified_user: ShieldCheck, visibility: Eye,
  warning: TriangleAlert, water_drop: Droplet, wc: Toilet, sentiment_neutral: Meh, notification_important: BellRing,
  bed_outline: Bed, image: FileImage, table_chart: Sheet, slideshow: Presentation, insert_drive_file: File,
}

export function Icone({ nom, className, style, title }: {
  nom: string | null | undefined
  className?: string
  style?: CSSProperties
  title?: string
}) {
  const Composant = (nom && ICONES[nom]) || Circle
  // L'ancien style « FILL 1 » des icônes Material n'a pas d'équivalent : ignoré.
  const { fontVariationSettings: _remplissage, ...reste } = style ?? {}
  void _remplissage
  return (
    <Composant
      size="1em"
      strokeWidth={2}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      className={`inline-block shrink-0 align-[-0.125em] ${className ?? ''}`}
      style={reste}
    />
  )
}

export default Icone
