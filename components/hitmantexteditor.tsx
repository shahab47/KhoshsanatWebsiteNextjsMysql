'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useEditor, EditorContent, } from '@tiptap/react';
import {  BubbleMenu, FloatingMenu } from '@tiptap/react/menus';
import { Extension } from '@tiptap/core';
import { Gapcursor } from '@tiptap/extensions';


// Tiptap Official Extensions
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import ImageNode from '@tiptap/extension-image';
import Dropcursor from '@tiptap/extension-dropcursor';
import LinkExt from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';





// Tiptap Table Extensions
import { TableKit } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';

// Drag Handle (React Component)
import DragHandle from '@tiptap/extension-drag-handle-react';
import AutoJoiner from 'tiptap-extension-auto-joiner';

// ProseMirror Plugin for Images
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { EditorView } from '@tiptap/pm/view';

// Lucide Icons
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Highlighter,
  List, ListOrdered, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Link, Unlink, Image as ImageIcon, Undo2, Redo2, Heading1, Heading2, Heading3,
  Quote, Code, CheckSquare, Type, Minus, Plus, ChevronDown,
  Baseline, Pilcrow, RemoveFormatting, Eraser, Table as TableIcon, Trash, Search, GripVertical,
  ArrowRight, ArrowLeft, ArrowUp, ArrowDown
} from 'lucide-react';

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const PREDEFINED_COLORS: string[] = [
  '#000000', '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
  '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6',
  '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#ffffff', '#9ca3af', '#4b5563',
  '#1f2937', '#7f1d1d', '#14532d',
];
const BRAND_COLORS: string[] = ['#2563EB', '#2D3644', '#EFF6FF', '#EBDDD3', '#6C6C6E', '#272324'];
const FONT_SIZES: string[] = ['10px', '12px', '14px', '16px', '18px', '20px', '24px', '30px', '36px', '48px', '60px'];
const LINE_HEIGHTS: string[] = ['1', '1.2', '1.4', '1.6', '1.8', '2', '2.5'];
const LETTER_SPACINGS: string[] = ['normal', '0.5px', '1px', '1.5px', '2px', '3px'];

// ─────────────────────────────────────────────
// Custom Tiptap Extensions
// ─────────────────────────────────────────────
const FontSizeExt = Extension.create({
  name: 'fontSize',
  addOptions() { return { types: ['textStyle'] }; },
  addGlobalAttributes() {
    return [{
      types: this.options.types,
      attributes: {
        fontSize: {
          default: null,
          parseHTML: (el: HTMLElement) => el.style.fontSize || null,
          renderHTML: (attrs: Record<string, string>) => attrs.fontSize ? { style: `font-size:${attrs.fontSize}` } : {},
        },
      },
    }];
  },
});

const LineHeightExt = Extension.create({
  name: 'lineHeight',
  addOptions() { return { types: ['paragraph', 'heading'] }; },
  addGlobalAttributes() {
    return [{
      types: this.options.types,
      attributes: {
        lineHeight: {
          default: null,
          parseHTML: (el: HTMLElement) => el.style.lineHeight || null,
          renderHTML: (attrs: Record<string, string>) => attrs.lineHeight ? { style: `line-height:${attrs.lineHeight}` } : {},
        },
      },
    }];
  },
});

const LetterSpacingExt = Extension.create({
  name: 'letterSpacing',
  addOptions() { return { types: ['textStyle'] }; },
  addGlobalAttributes() {
    return [{
      types: this.options.types,
      attributes: {
        letterSpacing: {
          default: null,
          parseHTML: (el: HTMLElement) => el.style.letterSpacing || null,
          renderHTML: (attrs: Record<string, string>) => attrs.letterSpacing ? { style: `letter-spacing:${attrs.letterSpacing}` } : {},
        },
      },
    }];
  },
});

const DeleteImagesPlugin = Extension.create({
  name: 'deleteImages',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('deleteImages'),
        view() {
          return {
            update(view: EditorView, prevState: any) {
              const { state } = view;
              const prevDoc = prevState.doc;
              const currentDoc = state.doc;
              const removedUrls: string[] = [];

              prevDoc.descendants((node: any, pos: number) => {
                if (node.type.name === 'image' && node.attrs.src) {
                  const sameNodeInCurrent = currentDoc.resolve(pos).nodeAfter;
                  if (!sameNodeInCurrent || sameNodeInCurrent.type.name !== 'image' || sameNodeInCurrent.attrs.src !== node.attrs.src) {
                    removedUrls.push(node.attrs.src);
                  }
                }
              });

              removedUrls.forEach(async (url) => {
                if (url.startsWith('data:')) return; 
                try { await fetch(`/api/upload?url=${encodeURIComponent(url)}`, { method: 'DELETE' }); }
                catch (err) { console.error('Failed to delete image:', err); }
              });
            },
          };
        },
      }),
    ];
  },
});

// Image Uploader Helper
const uploadImageFile = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', 'editor-media');
  const response = await fetch('/api/upload', { method: 'POST', body: formData });
  if (!response.ok) throw new Error('Upload failed');
  const data = await response.json() as { success: boolean; url: string };
  if (data.success && data.url) return data.url;
  throw new Error('Upload failed');
};

const handleImageUpload = async (file: File, view: EditorView, pos: number) => {
  try {
    const url = await uploadImageFile(file);
    const node = view.state.schema.nodes.image.create({ src: url });
    const transaction = view.state.tr.insert(pos, node);
    view.dispatch(transaction);
  } catch (error) {
    console.error('Image upload error:', error);
  }
};
/*
onst addImage = useCallback(() => {
  const url = window.prompt('URL')

  if (url) {
    editor.chain().focus().setImage({ src: url }).run()
  }
},[editor])
*/
// ─────────────────────────────────────────────
// Popovers Components
// ─────────────────────────────────────────────
interface ColorPickerPopoverProps { currentColor: string; onSelect: (color: string) => void; onClear: () => void; onClose: () => void; }
const ColorPickerPopover: React.FC<ColorPickerPopoverProps> = ({ currentColor, onSelect, onClear, onClose }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div ref={ref} dir="rtl" className="absolute top-full mt-1 right-0 w-60 rounded-lg border border-gray-200 bg-white p-3 shadow-2xl dark:border-gray-700 dark:bg-gray-800 z-50">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">رنگ‌های اصلی</p>
      <div className="grid grid-cols-8 gap-1 mb-3">
        {PREDEFINED_COLORS.map((c) => (
          <button key={c} type="button" onClick={() => { onSelect(c); onClose(); }} className="h-5 w-5 rounded border border-gray-200 dark:border-gray-600 hover:scale-110 transition-transform" style={{ backgroundColor: c }} />
        ))}
      </div>
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">رنگ برند</p>
      <div className="grid grid-cols-6 gap-1 mb-3">
        {BRAND_COLORS.map((c) => (
          <button key={c} type="button" onClick={() => { onSelect(c); onClose(); }} className="h-5 w-5 rounded border border-gray-200 dark:border-gray-600 hover:scale-110 transition-transform" style={{ backgroundColor: c }} />
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-700 pt-2">
        <span className="text-xs text-gray-500 dark:text-gray-400">رنگ دلخواه</span>
        <input type="color" value={currentColor && currentColor !== 'transparent' ? currentColor : '#000000'} onChange={(e) => { onSelect(e.target.value); onClose(); }} className="h-7 w-10 cursor-pointer rounded border border-gray-200 dark:border-gray-600 bg-transparent p-0" />
      </div>
      <button type="button" onClick={() => { onClear(); onClose(); }} className="mt-2 w-full rounded py-1 text-[11px] text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">حذف رنگ</button>
    </div>
  );
};

interface DropdownPopoverProps { items: string[]; current: string; onSelect: (val: string) => void; onClose: () => void; }
const DropdownPopover: React.FC<DropdownPopoverProps> = ({ items, current, onSelect, onClose }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute top-full mt-1 right-0 min-w-[80px] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg py-1 max-h-48 overflow-y-auto z-50">
      {items.map((item) => (
        <button key={item} type="button" onClick={() => { onSelect(item); onClose(); }} className={`block w-full text-right px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-200 transition-colors ${current === item ? 'bg-blue-50 dark:bg-blue-900/30 font-semibold text-blue-600 dark:text-blue-400' : ''}`}>
          {item}
        </button>
      ))}
    </div>
  );
};

const Sep: React.FC = () => <div className="h-5 w-px bg-gray-200 dark:bg-gray-700 mx-0.5 flex-shrink-0" />;

// ─────────────────────────────────────────────
// Toolbar Component
// ─────────────────────────────────────────────
const Toolbar: React.FC<{ editor: any }> = ({ editor }) => {
  const [textColorOpen, setTextColorOpen] = useState(false);
  const [bgColorOpen, setBgColorOpen] = useState(false);
  const [lineHeightOpen, setLineHeightOpen] = useState(false);
  const [letterSpacingOpen, setLetterSpacingOpen] = useState(false);
  const [fontSizeOpen, setFontSizeOpen] = useState(false);

  if (!editor) return null;

  const currentFontSize = editor.getAttributes('textStyle').fontSize ?? '16px';
  const fontSizeIdx = FONT_SIZES.indexOf(currentFontSize);
  const currentTextColor = editor.getAttributes('textStyle').color ?? '#000000';
  const currentBgColor = editor.getAttributes('highlight').color ?? 'transparent';
  const currentLineHeight = editor.getAttributes('paragraph').lineHeight ?? editor.getAttributes('heading').lineHeight ?? 'normal';
  const currentLetterSpacing = editor.getAttributes('textStyle').letterSpacing ?? 'normal';

  const closeAll = () => { setTextColorOpen(false); setBgColorOpen(false); setLineHeightOpen(false); setLetterSpacingOpen(false); setFontSizeOpen(false); };
  const btn = 'p-1.5 rounded transition-colors text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 flex-shrink-0';
  const btnOn = 'bg-gray-200 dark:bg-gray-600 shadow ring-1 ring-black/5 dark:ring-white/10';

  const setLink = () => {
    const prev = editor.getAttributes('link').href ?? '';
    let url = window.prompt('آدرس لینک:', prev);
    if (url === null) return;
    if (url === '') { editor.chain().focus().extendMarkRange('link').unsetLink().run(); return; }
    if (!/^https?:\/\//i.test(url) && !url.startsWith('mailto:') && !url.startsWith('tel:')) {
      url = `https://${url}`;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div dir="rtl" className="flex flex-wrap items-center gap-0.5 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 px-2 py-1.5 w-full flex-shrink-0 z-40 relative">
      <button type="button" onClick={() => editor.chain().focus().undo().run()} className={btn} title="بازگشت"><Undo2 size={16} /></button>
      <button type="button" onClick={() => editor.chain().focus().redo().run()} className={btn} title="تکرار"><Redo2 size={16} /></button>
      <Sep />

      <div className="relative flex-shrink-0">
        <button type="button" onClick={() => { closeAll(); setFontSizeOpen((v) => !v); }} className={`${btn} flex items-center gap-0.5 text-xs min-w-[54px] justify-between`}>
          <span>{currentFontSize}</span><ChevronDown size={11} />
        </button>
        {fontSizeOpen && <DropdownPopover items={FONT_SIZES} current={currentFontSize} onSelect={(val) => editor.chain().focus().setMark('textStyle', { fontSize: val }).run()} onClose={() => setFontSizeOpen(false)} />}
      </div>
      <button type="button" onClick={() => fontSizeIdx > 0 && editor.chain().focus().setMark('textStyle', { fontSize: FONT_SIZES[fontSizeIdx - 1] }).run()} className={`${btn} text-xs font-bold`} title="کوچک‌تر">A-</button>
      <button type="button" onClick={() => fontSizeIdx < FONT_SIZES.length - 1 && editor.chain().focus().setMark('textStyle', { fontSize: FONT_SIZES[fontSizeIdx + 1] }).run()} className={`${btn} text-xs font-bold`} title="بزرگ‌تر">A+</button>
      <Sep />

      <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={`${btn} ${editor.isActive('bold') ? btnOn : ''}`}><Bold size={16} /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={`${btn} ${editor.isActive('italic') ? btnOn : ''}`}><Italic size={16} /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={`${btn} ${editor.isActive('underline') ? btnOn : ''}`}><UnderlineIcon size={16} /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} className={`${btn} ${editor.isActive('strike') ? btnOn : ''}`}><Strikethrough size={16} /></button>
      <button type="button" onClick={() => editor.chain().focus().unsetAllMarks().run()} className={btn}><RemoveFormatting size={16} /></button>
      <Sep />

      <div className="relative flex-shrink-0">
        <button type="button" onClick={() => { closeAll(); setTextColorOpen((v) => !v); }} className={`${btn} flex flex-col items-center`}><Baseline size={15} /><div className="h-[3px] w-4 rounded-full mt-0.5" style={{ backgroundColor: currentTextColor }} /></button>
        {textColorOpen && <ColorPickerPopover currentColor={currentTextColor} onSelect={(c) => editor.chain().focus().setColor(c).run()} onClear={() => editor.chain().focus().unsetColor().run()} onClose={() => setTextColorOpen(false)} />}
      </div>
      <div className="relative flex-shrink-0">
        <button type="button" onClick={() => { closeAll(); setBgColorOpen((v) => !v); }} className={`${btn} flex flex-col items-center`}><Highlighter size={15} /><div className="h-[3px] w-4 rounded-full mt-0.5 border border-gray-300 dark:border-gray-600" style={{ backgroundColor: currentBgColor !== 'transparent' ? currentBgColor : 'transparent' }} /></button>
        {bgColorOpen && <ColorPickerPopover currentColor={currentBgColor} onSelect={(c) => editor.chain().focus().toggleHighlight({ color: c }).run()} onClear={() => editor.chain().focus().unsetHighlight().run()} onClose={() => setBgColorOpen(false)} />}
      </div>
      <Sep />

      <div className="flex items-center rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-0.5 gap-0.5 flex-shrink-0" dir="ltr">
        {[
          { align: 'right', Icon: AlignRight, label: 'راست' },
          { align: 'center', Icon: AlignCenter, label: 'وسط' },
          { align: 'left', Icon: AlignLeft, label: 'چپ' },
          { align: 'justify', Icon: AlignJustify, label: 'جاستیفای' },
        ].map(({ align, Icon, label }) => (
          <button type="button" key={align} onClick={() => editor.chain().focus().setTextAlign(align).run()} className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 ${editor.isActive({ textAlign: align }) ? 'bg-gray-200 dark:bg-gray-700' : ''}`} title={label}><Icon size={15} /></button>
        ))}
      </div>
      <Sep />

      <div className="relative flex-shrink-0">
        <button type="button" onClick={() => { closeAll(); setLineHeightOpen((v) => !v); }} className={`${btn} flex items-center gap-0.5`}>
          <Pilcrow size={14} /><ChevronDown size={10} />
        </button>
        {lineHeightOpen && <DropdownPopover items={LINE_HEIGHTS} current={currentLineHeight} onSelect={(val) => { editor.chain().focus().updateAttributes('paragraph', { lineHeight: val }).run(); editor.chain().focus().updateAttributes('heading', { lineHeight: val }).run(); closeAll(); }} onClose={() => setLineHeightOpen(false)} />}
      </div>

      <div className="relative flex-shrink-0">
        <button type="button" onClick={() => { closeAll(); setLetterSpacingOpen((v) => !v); }} className={`${btn} flex items-center gap-0.5 text-[11px]`}>
          <span className="font-medium">A↔A</span><ChevronDown size={10} />
        </button>
        {letterSpacingOpen && <DropdownPopover items={LETTER_SPACINGS} current={currentLetterSpacing} onSelect={(val) => editor.chain().focus().setMark('textStyle', { letterSpacing: val }).run()} onClose={() => setLetterSpacingOpen(false)} />}
      </div>
      <Sep />

      <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={`${btn} ${editor.isActive('bulletList') ? btnOn : ''}`}><List size={16} /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`${btn} ${editor.isActive('orderedList') ? btnOn : ''}`}><ListOrdered size={16} /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleTaskList().run()} className={`${btn} ${editor.isActive('taskList') ? btnOn : ''}`}><CheckSquare size={16} /></button>
      <Sep />

      <button type="button" onClick={setLink} className={`${btn} ${editor.isActive('link') ? btnOn : ''}`}><Link size={16} /></button>
      <button type="button" onClick={() => editor.chain().focus().unsetLink().run()} className={btn}><Unlink size={16} /></button>

      <button
        type="button"
        onClick={() => {
          const input = document.createElement('input');
          input.type = 'file'; input.accept = 'image/*';
          input.onchange = async () => {
            if (input.files?.[0]) {
              const url = await uploadImageFile(input.files[0]);
              //const url = await addImage(input.files[0]);
              editor.chain().focus().setImage({ src: url }).run();
            }
          };
          input.click();
        }}
        className={btn} title="تصویر"
      ><ImageIcon size={16} /></button>

      <button type="button" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} className={btn} title="جدول">
        <TableIcon size={16} />
      </button>

    </div>
  );
};

// ─────────────────────────────────────────────
// Main Editor Component
// ─────────────────────────────────────────────
interface AdvancedRichEditorProps {
  initialValue?: Record<string, unknown> | string | any;
  value?: Record<string, unknown> | string | any;
  slug?: string;
  onChange?: (content: string) => void;
  placeholder?: string;
}

export default function AdvancedRichEditor({
  initialValue,
  value,
  slug,
  onChange,
  placeholder = 'برای نوشتن کلیک کنید یا شروع به تایپ کنید...',
}: AdvancedRichEditorProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const menuItems = useMemo(() => [
    { title: 'متن ساده', description: 'پاراگراف معمولی', icon: <Type size={18} />, action: (editor: any) => editor.chain().focus().setParagraph().run() },
    { title: 'تیتر ۱', description: 'تیتر اصلی و بزرگ', icon: <Heading1 size={18} />, action: (editor: any) => editor.chain().focus().toggleHeading({ level: 1 }).run() },
    { title: 'تیتر ۲', description: 'زیرتیتر متوسط', icon: <Heading2 size={18} />, action: (editor: any) => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { title: 'تیتر ۳', description: 'تیتر کوچک', icon: <Heading3 size={18} />, action: (editor: any) => editor.chain().focus().toggleHeading({ level: 3 }).run() },
    { title: 'جدول', description: 'جدول ۳ در ۳', icon: <TableIcon size={18} />, action: (editor: any) => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
    { title: 'لیست نقطه‌ای', description: 'لیست با بولت', icon: <List size={18} />, action: (editor: any) => editor.chain().focus().toggleBulletList().run() },
    { title: 'لیست شماره‌دار', description: 'لیست مرتب شده', icon: <ListOrdered size={18} />, action: (editor: any) => editor.chain().focus().toggleOrderedList().run() },
    { title: 'چک‌لیست', description: 'لیست وظایف', icon: <CheckSquare size={18} />, action: (editor: any) => editor.chain().focus().toggleTaskList().run() },
    { title: 'نقل قول', description: 'متن نقل شده', icon: <Quote size={18} />, action: (editor: any) => editor.chain().focus().toggleBlockquote().run() },
    { title: 'کد', description: 'بلاک کد برنامه‌نویسی', icon: <Code size={18} />, action: (editor: any) => editor.chain().focus().toggleCodeBlock().run() },
    { title: 'جداکننده', description: 'خط افقی', icon: <Minus size={18} />, action: (editor: any) => editor.chain().focus().setHorizontalRule().run() },
  ], []);

  const filteredItems = useMemo(() => {
    if (!searchTerm) return menuItems;
    return menuItems.filter(item =>
      item.title.includes(searchTerm) || item.description.includes(searchTerm)
    );
  }, [searchTerm, menuItems]);

  const extensionsList = useMemo(() => [
    StarterKit.configure({ horizontalRule: false }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    FontSizeExt,
    LineHeightExt,
    LetterSpacingExt,
    TaskList,
    TaskItem.configure({ nested: true }),
    LinkExt.configure({ openOnClick: false }),
    Underline,
    TextStyle,
    Color,
    Highlight.configure({ multicolor: true }),
    Placeholder.configure({ placeholder }),
    Gapcursor,
    TableKit.configure({
        table: { resizable: true },
      }),
    //TableRow,
    //TableHeader,
    //TableCell,
    // استفاده از کانفیگ تصویر و دراپ کرسر بر اساس کدهای درخواستی کاربر
    ImageNode.configure({ 
      allowBase64: true, 
      HTMLAttributes: { class: 'rounded-lg border border-muted max-w-full h-auto mx-auto' },
      resize: {
        enabled: true,
        alwaysPreserveAspectRatio: true,
      }
    } as any),
    Dropcursor,
    AutoJoiner.configure({ elementsToJoin: ["bulletList", "orderedList"] }),
  ], [placeholder]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: extensionsList,
    content: value || initialValue,
    editorProps: {
      attributes: { class: 're-prose prose prose-lg dark:prose-invert focus:outline-none max-w-full min-h-[400px] text-right' },
      handlePaste: (view, event) => {
        const items = Array.from(event.clipboardData?.items || []);
        const image = items.find(item => item.type.indexOf('image') === 0);
        if (image) {
          event.preventDefault();
          const file = image.getAsFile();
          if (file) {
            handleImageUpload(file, view, view.state.selection.from);
            return true;
          }
        }
        return false;
      },
      handleDrop: (view, event, slice, moved) => {
        if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
          const file = event.dataTransfer.files[0];
          if (file.type.startsWith('image/')) {
            event.preventDefault();
            const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
            if (coordinates) {
              handleImageUpload(file, view, coordinates.pos);
            }
            return true;
          }
        }
        return false;
      }
    },
    onUpdate: ({ editor }) => {
      if (onChange) {
        const htmlContent = editor.getHTML();
        if (htmlContent === '<p></p>' || htmlContent === '') {
          onChange('');
        } else {
          onChange(htmlContent);
        }
      }
    },
  });

  if (!editor) return null;

  const bBtn = 'p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors cursor-pointer flex-shrink-0';
  const bBtnOn = 'bg-gray-200 dark:bg-gray-600';
  const BSep = () => <div className="h-4 w-px bg-gray-200 dark:bg-gray-600 mx-0.5 flex-shrink-0" />;


  if (!editor) {
    return null
  }
  const setBubbleLink = () => {
    let url = window.prompt('آدرس لینک:');
    if (url === null) return;
    if (url === '') { editor.chain().focus().extendMarkRange('link').unsetLink().run(); return; }
    if (!/^https?:\/\//i.test(url) && !url.startsWith('mailto:') && !url.startsWith('tel:')) {
      url = `https://${url}`;
    }
    editor.chain().focus().setLink({ href: url }).run();
  };

  return (
    <div className="editor-root w-full">
      <style dangerouslySetInnerHTML={{
        __html: `
          .re-prose table{border-collapse:collapse;margin:1rem 0;table-layout:fixed;width:100%;direction:rtl}
          .re-prose table td,.re-prose table th{border:1px solid #d1d5db;box-sizing:border-box;min-width:1em;padding:8px;vertical-align:top;text-align:right;position:relative}
          .re-prose table th{background:#f3f4f6;font-weight:700}
          .dark .re-prose table td,.dark .re-prose table th{border-color:#374151}
          .dark .re-prose table th{background:#1f2937}
          
          .ProseMirror > *:first-child { margin-top: 0 !important; }
          .ProseMirror > *:last-child { margin-bottom: 0 !important; }
          
          /* لینک‌ها: اطمینان از آبی بودن تمام لینک‌ها */
          .re-prose a {
            color: #2563eb !important;
            text-decoration: underline !important;
            cursor: pointer;
          }
          
          /* لیست‌های معمولی (هم‌سطح کردن پاراگراف و بولت/شماره) */
          .re-prose ul { list-style-type: disc; padding-right: 1.5rem; margin-top: 0.5rem; margin-bottom: 0.5rem; }
          .re-prose ol { list-style-type: decimal; padding-right: 1.5rem; margin-top: 0.5rem; margin-bottom: 0.5rem; }
          
          .re-prose ul:not([data-type="taskList"]) li > p,
          .re-prose ol li > p {
            margin: 0 !important;
            display: inline;
          }
          
          /* چک لیست‌ها (رفع مشکل فاصله و خط جدید) */
          .re-prose ul[data-type="taskList"] {
            list-style: none;
            padding-right: 0;
          }
          .re-prose ul[data-type="taskList"] li {
            display: flex;
            align-items: flex-start;
            margin-bottom: 0.5rem;
          }
          .re-prose ul[data-type="taskList"] li > label {
            display: flex;
            margin-top: 0.25rem;
            margin-left: 0.5rem;
            user-select: none;
          }
          .re-prose ul[data-type="taskList"] li > label input[type="checkbox"] {
            cursor: pointer;
            width: 1.1rem;
            height: 1.1rem;
          }
          .re-prose ul[data-type="taskList"] li > div {
            flex: 1 1 auto;
            margin: 0;
          }
          .re-prose ul[data-type="taskList"] li > div > p {
            margin: 0;
            display: block; 
          }
          
          /* Placeholder */
          .ProseMirror p.is-editor-empty:first-child::before {
            content: attr(data-placeholder); float: right; color: #adb5bd; pointer-events: none; height: 0;
          }
          
          /* استایل تصویر با قابلیت ریسایز */
          .re-prose img {
            max-width: 100%;
            height: auto;
          }
          .re-prose img.ProseMirror-selectednode {
            outline: 3px solid #3b82f6;
          }
        `,
      }} />

      <div className="relative w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-lg flex flex-col min-h-[600px]">
        <Toolbar editor={editor} />
        
        <div className="flex-grow flex relative">
          
          {/* قرار دادن DragHandle در سمت راست */}
          <DragHandle editor={editor} nested={true} computePositionConfig={{ placement: 'right-start', strategy: 'absolute' }}>
            <div className="flex items-center justify-center w-6 h-6 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 cursor-grab transition-colors">
              <GripVertical size={16} />
            </div>
          </DragHandle>

          <div className="editor-wrapper w-full px-6 py-8 sm:px-14 sm:py-10" dir="rtl">
            <EditorContent editor={editor} />

            {/* حباب تنظیمات گسترده برای جدول */}
            <BubbleMenu 
              editor={editor} 
              shouldShow={({ editor }) => editor.isActive('table')}
              pluginKey="tableBubbleMenu"
              className="flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl rounded-lg p-1.5 items-center z-50 max-w-sm gap-y-1.5"
            >
              <div dir="rtl" className="flex items-center gap-1 w-full justify-center">
                <button type="button" onClick={() => editor.chain().focus().addColumnBefore().run()} className={bBtn} title="افزودن ستون قبل"><ArrowRight size={14}/></button>
                <button type="button" onClick={() => editor.chain().focus().addColumnAfter().run()} className={bBtn} title="افزودن ستون بعد"><ArrowLeft size={14}/></button>
                <button type="button" onClick={() => editor.chain().focus().deleteColumn().run()} className={`${bBtn} text-red-500`} title="حذف ستون"><Minus size={14} /></button>
                <BSep />
                <button type="button" onClick={() => editor.chain().focus().addRowBefore().run()} className={bBtn} title="افزودن سطر قبل"><ArrowUp size={14} /></button>
                <button type="button" onClick={() => editor.chain().focus().addRowAfter().run()} className={bBtn} title="افزودن سطر بعد"><ArrowDown size={14} /></button>
                <button type="button" onClick={() => editor.chain().focus().deleteRow().run()} className={`${bBtn} text-red-500`} title="حذف سطر"><Minus size={14} /></button>
                <BSep />
                <button type="button" onClick={() => editor.chain().focus().deleteTable().run()} className={`${bBtn} text-red-500`} title="حذف کل جدول"><Trash size={14} /></button>
              </div>
              <div dir="rtl" className="flex items-center gap-1 w-full justify-center pt-1.5 border-t border-gray-100 dark:border-gray-700">
                <button type="button" onClick={() => editor.chain().focus().mergeCells().run()} className={bBtn} title="ادغام سلول‌ها"><span className="text-[11px] px-0.5 font-bold">ادغام</span></button>
                <button type="button" onClick={() => editor.chain().focus().splitCell().run()} className={bBtn} title="جدا کردن سلول"><span className="text-[11px] px-0.5 font-bold">جدا</span></button>
                <BSep />
                <button type="button" onClick={() => (editor.chain().focus() as any).toggleHeaderRow().run()} className={bBtn} title="هدر سطر"><span className="text-[11px] px-0.5 font-bold">هدر سطر</span></button>
                <button type="button" onClick={() => (editor.chain().focus() as any).toggleHeaderColumn().run()} className={bBtn} title="هدر ستون"><span className="text-[11px] px-0.5 font-bold">هدر ستون</span></button>
                <button type="button" onClick={() => (editor.chain().focus() as any).toggleHeaderCell().run()} className={bBtn} title="هدر سلول"><span className="text-[11px] px-0.5 font-bold">هدر سلول</span></button>
                <button onClick={() => (editor.chain().focus() as any).setCellAttribute('colspan', 2).run()}></button>
              </div>
            </BubbleMenu>

            <BubbleMenu 
              editor={editor} 
              shouldShow={({ editor, from, to }) => !editor.isActive('table') && !editor.isActive('image') && from !== to}
              pluginKey="textBubbleMenu"
              className="flex bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl rounded-lg p-1 items-center z-50"
            >
              <div dir="rtl" className="flex items-center gap-0.5">
                <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={`${bBtn} ${editor.isActive('bold') ? bBtnOn : ''}`}><Bold size={14}/></button>
                <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={`${bBtn} ${editor.isActive('italic') ? bBtnOn : ''}`}><Italic size={14}/></button>
                <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={`${bBtn} ${editor.isActive('underline') ? bBtnOn : ''}`}><UnderlineIcon size={14}/></button>
                <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} className={`${bBtn} ${editor.isActive('strike') ? bBtnOn : ''}`}><Strikethrough size={14}/></button>
                <BSep />
                <button type="button" onClick={setBubbleLink} className={bBtn}><Link size={14}/></button>
              </div>
            </BubbleMenu>

            <FloatingMenu 
              editor={editor} 
              className="z-50 h-auto max-h-[350px] w-64 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-3 shadow-2xl flex flex-col"
            >
              <div className="flex items-center px-2 pb-2 mb-2 border-b border-gray-100 dark:border-gray-700">
                <Search size={14} className="text-gray-400 ml-2" />
                <input 
                  type="text" 
                  placeholder="جستجوی بلاک..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-transparent text-sm w-full focus:outline-none text-gray-700 dark:text-gray-200"
                />
              </div>
              
              <div className="flex flex-col gap-1 overflow-y-auto">
                {filteredItems.length === 0 ? (
                  <p className="text-center text-xs text-gray-500 py-4">نتیجه‌ای یافت نشد.</p>
                ) : (
                  filteredItems.map((item, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => { item.action(editor); setSearchTerm(''); }}
                      className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-right hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex-shrink-0 text-gray-600 dark:text-gray-300">
                        {item.icon}
                      </div>
                      <div className="flex flex-col">
                        <p className="font-medium text-[13px] text-gray-800 dark:text-gray-200">{item.title}</p>
                        <p className="text-[10px] text-gray-500">{item.description}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </FloatingMenu>
          </div>
        </div>
      </div>
    </div>
  );
}