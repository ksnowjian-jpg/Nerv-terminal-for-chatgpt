import { z } from 'zod';

export const ENGINE_VERSION = '0.1.0';
const file = z.string().regex(/^[a-zA-Z0-9_/-]+\.(json|css|svg|png|webp|ttf|woff2)$/).refine(v => !v.includes('..') && !v.startsWith('/'));
const assetId=z.string().regex(/^[a-z][a-z0-9-]{0,39}$/);
const fontName=z.string().min(1).max(80).regex(/^[a-zA-Z][a-zA-Z0-9 -]*$/);
const color = z.string().regex(/^#[\da-fA-F]{6}$/);
export const tokensSchema = z.object({
  background: color, surface: color, elevated: color, text: color, muted: color,
  accent: color, accentText: color, border: color, success: color,
  chatBackground:color.optional(),chatSurface:color.optional(),chatElevated:color.optional(),
  chatText:color.optional(),chatMuted:color.optional(),chatAccent:color.optional(),chatAccentText:color.optional(),chatBorder:color.optional(),
  userBubbleBackground:color.optional(),userBubbleText:color.optional(),
  font: z.string().min(1).max(160).regex(/^[\w\s,"'-]+$/),
  displayFont: z.string().min(1).max(160).regex(/^[\w\s,"'-]+$/),
  headingFont: z.string().min(1).max(160).regex(/^[\w\s,"'-]+$/).optional(),
  radius: z.number().int().min(0).max(24)
}).strict();
export const layoutSchema = z.object({
  navigationWidth: z.number().int().min(190).max(300),
  panelWidth: z.number().int().min(240).max(380),
  contentWidth: z.number().int().min(480).max(960),
  gap: z.number().int().min(8).max(32),
  slots: z.array(z.enum(['usage', 'connection', 'theme'])).min(1).max(3).refine(v => new Set(v).size === v.length)
}).strict();
export const manifestSchema = z.object({
  schemaVersion: z.literal(1), id: z.string().regex(/^[a-z][a-z0-9-]{0,47}$/),
  name: z.string().min(1).max(60), version: z.string().regex(/^\d+\.\d+\.\d+$/),
  author: z.string().min(1).max(80), description: z.string().max(240),
  engineVersion: z.literal('^0.1.0'), tokens: file, layout: file, css: file.optional(),
  assets: z.object({
    emblem: file.optional(), images:z.record(assetId,file).default({}),
    icons:z.record(z.enum(['refresh','restore','status','brand','home']),file).default({}),
    fonts:z.array(z.object({family:fontName,file,weight:z.number().int().min(100).max(900).default(400)}).strict()).max(4).default([])
  }).strict().default({}),
  presentation:z.object({
    panelTitle:z.string().max(60).optional(),kicker:z.string().max(80).optional(),
    brandLabel:z.string().max(60).optional(),brandSubtitle:z.string().max(80).optional(),
    brandImage:assetId.optional(),
    brandWordmark:assetId.optional(),
    welcomeText:z.string().trim().min(1).max(80).optional(),
    welcomeCaption:z.string().trim().min(1).max(100).optional(),
    composerPlaceholder:z.string().trim().min(1).max(100).optional(),
    panelText:z.record(z.enum(['panelLabel','intro','title','refresh','restore','restoreHint','collapse','expand','lastRead','reset','neverRead','resetUnknown','statusLive','statusCached','statusUnavailable','statusRefreshing','noteInitial','noteLive','noteCached','noteRefreshing','progressLabel','themeLabel']),z.string().max(240)).optional(),
    navigationBadge:z.object({image:assetId,label:z.string().max(40),caption:z.string().max(60),detail:z.string().max(60).optional()}).strict().optional(),
    headerBand:z.object({label:z.string().max(40),caption:z.string().max(80),serial:z.string().max(12).optional()}).strict().optional(),
    diagram:z.object({image:assetId,title:z.string().max(60),caption:z.string().max(100)}).strict().optional(),
    watermark:z.object({image:assetId,opacity:z.number().min(.02).max(.15).default(.06),render:z.enum(['mask','image']).optional()}).strict().optional(),
    footer:z.string().max(100).optional()
  }).strict().optional(),
  variants: z.array(z.object({id: z.string().regex(/^[a-z][a-z0-9-]*$/), name: z.string().max(40), tokens: tokensSchema.partial()}).strict()).max(8).default([]),
  motion: z.object({durationMs: z.number().int().min(0).max(400)}).strict(),
  startup: z.object({enabled: z.boolean(), durationMs: z.number().int().min(0).max(5000), lines: z.array(z.string().max(80)).max(5), sound: z.literal(false)}).strict()
}).strict();
export type ThemeManifest = z.infer<typeof manifestSchema>;
export type Tokens = z.infer<typeof tokensSchema>;
export type Layout = z.infer<typeof layoutSchema>;
export interface ThemePackage { manifest: ThemeManifest; tokens: Tokens; layout: Layout; css: string; emblem?: string; images?:Record<string,string>; icons?:Record<string,string>; fonts?:Array<{family:string;data:string;format:'truetype'|'woff2';weight:number}> }
export interface Catalog { themes: ThemePackage[]; errors: string[] }
