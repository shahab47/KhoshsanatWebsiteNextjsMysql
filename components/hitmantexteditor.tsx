'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Bold, Italic, Underline, AlignRight, AlignCenter, AlignLeft,
  List, ListOrdered, Link as LinkIcon, Image as ImageIcon, Table, Loader2, Strikethrough,
  Palette, Eraser, Code, Eye, X, Crop, Check
} from 'lucide-react';

interface HitmanTextEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  slug?: string;
}

export default function HitmanTextEditor({ value = '', onChange, slug = '' }: HitmanTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastSentValue = useRef<string>(value);
  const [activeStyles, setActiveStyles] = useState<Record<string, boolean>>({});
  const [currentFont, setCurrentFont] = useState('Vazir');
  const [isCodeView, setIsCodeView] = useState(false);
  const [htmlContent, setHtmlContent] = useState(value);
  const [savedRange, setSavedRange] = useState<Range | null>(null);
  const [hasSelection, setHasSelection] = useState(false);

  // Modal states
  const [tableModal, setTableModal] = useState({ isOpen: false, rows: 3, cols: 3 });
  const [linkModal, setLinkModal] = useState({ isOpen: false, url: 'https://' });
  const [cropModal, setCropModal] = useState({ isOpen: false, src: '', file: null as File | null });
  const [cropRect, setCropRect] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [isDrawingCrop, setIsDrawingCrop] = useState(false);
  const [cropStartPos, setCropStartPos] = useState({ x: 0, y: 0 });
  const [isUploading, setIsUploading] = useState(false);

  // ---------- Helper: trigger content change ----------
  const triggerChange = useCallback(() => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      if (html !== lastSentValue.current) {
        lastSentValue.current = html;
        setHtmlContent(html);
        onChange?.(html);
      }
    }
  }, [onChange]);

  // ---------- Resize Handlers (4 corners) ----------
  const attachResizeHandlers = useCallback((container: HTMLElement) => {
    const images = container.querySelectorAll('img:not(.resize-enabled)');
    images.forEach((img) => {
      const imgEl = img as HTMLImageElement;
      if (imgEl.parentElement?.classList.contains('image-resize-wrapper')) return;

      const wrapper = document.createElement('div');
      wrapper.className = 'image-resize-wrapper relative inline-block group';
      wrapper.style.position = 'relative';
      wrapper.style.display = 'inline-block';
      wrapper.style.userSelect = 'none';
      imgEl.parentNode?.insertBefore(wrapper, imgEl);
      wrapper.appendChild(imgEl);

      // Set initial width
      const currentWidth = imgEl.getBoundingClientRect().width;
      imgEl.style.width = `${currentWidth}px`;
      wrapper.style.width = `${currentWidth}px`;
      imgEl.style.height = 'auto';

      // Create four resize handles
      const positions = ['nw', 'ne', 'sw', 'se'];
      positions.forEach(pos => {
        const handle = document.createElement('div');
        handle.className = `resize-handler ${pos}`;
        handle.style.position = 'absolute';
        handle.style.width = '12px';
        handle.style.height = '12px';
        handle.style.backgroundColor = '#3b82f6';
        handle.style.borderRadius = '50%';
        handle.style.border = '2px solid white';
        handle.style.zIndex = '20';
        handle.style.opacity = '0';
        handle.style.transition = 'opacity 0.2s';
        handle.style.cursor = `${pos}-resize`;

        switch (pos) {
          case 'nw':
            handle.style.top = '-6px';
            handle.style.left = '-6px';
            break;
          case 'ne':
            handle.style.top = '-6px';
            handle.style.right = '-6px';
            break;
          case 'sw':
            handle.style.bottom = '-6px';
            handle.style.left = '-6px';
            break;
          case 'se':
            handle.style.bottom = '-6px';
            handle.style.right = '-6px';
            break;
        }
        wrapper.appendChild(handle);

        let startX = 0, startY = 0, startWidth = 0, startHeight = 0;
        let isResizing = false;

        const onMouseMove = (e: MouseEvent) => {
          if (!isResizing) return;
          e.preventDefault();
          const dx = e.clientX - startX;
          const dy = e.clientY - startY;
          let newWidth = startWidth;
          let newHeight = startHeight;

          switch (pos) {
            case 'se':
              newWidth = startWidth + dx;
              newHeight = startHeight + dy;
              break;
            case 'sw':
              newWidth = startWidth - dx;
              newHeight = startHeight + dy;
              break;
            case 'ne':
              newWidth = startWidth + dx;
              newHeight = startHeight - dy;
              break;
            case 'nw':
              newWidth = startWidth - dx;
              newHeight = startHeight - dy;
              break;
          }
          newWidth = Math.min(Math.max(50, newWidth), wrapper.parentElement?.clientWidth || 1200);
          imgEl.style.width = `${newWidth}px`;
          wrapper.style.width = `${newWidth}px`;
          imgEl.style.height = 'auto';
          triggerChange();
        };

        const onMouseUp = () => {
          if (!isResizing) return;
          isResizing = false;
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
          triggerChange();
        };

        const onMouseDown = (e: MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
          startX = e.clientX;
          startY = e.clientY;
          startWidth = wrapper.offsetWidth;
          startHeight = wrapper.offsetHeight;
          isResizing = true;
          document.addEventListener('mousemove', onMouseMove);
          document.addEventListener('mouseup', onMouseUp);
        };

        handle.addEventListener('mousedown', onMouseDown);
      });

      // Show handles on hover
      wrapper.addEventListener('mouseenter', () => {
        wrapper.querySelectorAll('.resize-handler').forEach(h => (h as HTMLElement).style.opacity = '1');
      });
      wrapper.addEventListener('mouseleave', () => {
        wrapper.querySelectorAll('.resize-handler').forEach(h => (h as HTMLElement).style.opacity = '0');
      });

      imgEl.classList.add('resize-enabled');
    });
  }, [triggerChange]);

  // ---------- Editor input handler ----------
  const handleInput = useCallback(() => {
    if (editorRef.current) {
      triggerChange();
      attachResizeHandlers(editorRef.current);
    }
  }, [triggerChange, attachResizeHandlers]);

  // Sync external value
  useEffect(() => {
    if (editorRef.current && value !== lastSentValue.current) {
      editorRef.current.innerHTML = value || '';
      setHtmlContent(value || '');
      lastSentValue.current = value || '';
      attachResizeHandlers(editorRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]); // فقط به value وابسته باش

  // ---------- Toolbar and formatting ----------
  useEffect(() => {
    document.execCommand('defaultParagraphSeparator', false, 'p');
    document.execCommand('styleWithCSS', false, 'false');
  }, []);

  const updateFormatting = useCallback(() => {
    if (!editorRef.current || isCodeView) return;
    const formats = ['bold', 'italic', 'underline', 'strikeThrough', 'justifyLeft', 'justifyCenter', 'justifyRight', 'insertUnorderedList', 'insertOrderedList'];
    const current: Record<string, boolean> = {};
    formats.forEach(f => { current[f] = document.queryCommandState(f); });
    setActiveStyles(current);
    const fontName = document.queryCommandValue('fontName');
    if (fontName) setCurrentFont(fontName.replace(/['"]/g, ''));
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed && editorRef.current.contains(sel.anchorNode)) setHasSelection(true);
    else setHasSelection(false);
  }, [isCodeView]);

  useEffect(() => {
    const handleSelectionChange = () => {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) updateFormatting();
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [updateFormatting]);

  const saveRange = () => {
    if (isCodeView) return;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (editorRef.current?.contains(range.commonAncestorContainer)) setSavedRange(range);
      else if (editorRef.current) {
        const newRange = document.createRange();
        newRange.selectNodeContents(editorRef.current);
        newRange.collapse(false);
        setSavedRange(newRange);
      }
    } else if (editorRef.current) {
      const range = document.createRange();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
      setSavedRange(range);
    }
  };

  const restoreRange = () => {
    if (isCodeView || !savedRange) return;
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(savedRange);
    editorRef.current?.focus();
  };

  const exec = (command: string, val?: string) => {
    if (isCodeView) return;
    restoreRange();
    document.execCommand(command, false, val);
    editorRef.current?.focus();
    handleInput();
    updateFormatting();
  };

  const changeFontSize = (delta: number) => {
    if (isCodeView) return;
    let cur = parseInt(document.queryCommandValue('fontSize')) || 3;
    cur = Math.min(7, Math.max(1, cur + delta));
    exec('fontSize', cur.toString());
  };

  const confirmTable = () => {
    restoreRange();
    const { rows, cols } = tableModal;
    let html = `<br/><table style="width:100%; border-collapse:collapse; margin-bottom:1rem"><tbody>`;
    for (let i = 0; i < rows; i++) {
      html += '<tr>';
      for (let j = 0; j < cols; j++) {
        if (i === 0) html += `<th style="border:1px solid #cbd5e1; padding:8px;">عنوان ${j + 1}</th>`;
        else html += `<td style="border:1px solid #e2e8f0; padding:8px;">محتوا</td>`;
      }
      html += '</tr>';
    }
    html += '</tbody></table><br/>';
    document.execCommand('insertHTML', false, html);
    handleInput();
    setTableModal({ ...tableModal, isOpen: false });
  };

  const confirmLink = () => {
    restoreRange();
    if (linkModal.url && linkModal.url !== 'https://') {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        const div = document.createElement('div');
        div.appendChild(range.cloneContents());
        let text = div.innerHTML || linkModal.url;
        const linkHtml = `<a href="${linkModal.url}" target="_blank" style="color:#2563eb; text-decoration:underline; font-weight:bold;">${text}</a>`;
        document.execCommand('insertHTML', false, linkHtml);
        handleInput();
      }
    }
    setLinkModal({ ...linkModal, isOpen: false, url: 'https://' });
  };

  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isCodeView) { alert('لطفاً ابتدا از حالت کد خارج شوید.'); e.target.value = ''; return; }
    const file = e.target.files?.[0];
    if (!file) return;
    if (!slug) { alert('لطفاً ابتدا نامک (Slug) را وارد کنید.'); return; }
    saveRange();
    if (editorRef.current && editorRef.current.innerHTML.trim() === '') {
      document.execCommand('insertHTML', false, '<p><br></p>');
      saveRange();
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCropModal({ isOpen: true, src: ev.target?.result as string, file });
      setCropRect({ x: 0, y: 0, w: 0, h: 0 });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const onCropMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const img = e.currentTarget.querySelector('img') as HTMLImageElement;
    if (!img) return;
    const rect = img.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCropStartPos({ x, y });
    setCropRect({ x, y, w: 0, h: 0 });
    setIsDrawingCrop(true);
  };

  const onCropMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawingCrop) return;
    const img = e.currentTarget.querySelector('img') as HTMLImageElement;
    if (!img) return;
    const rect = img.getBoundingClientRect();
    let curX = e.clientX - rect.left;
    let curY = e.clientY - rect.top;
    curX = Math.min(Math.max(curX, 0), rect.width);
    curY = Math.min(Math.max(curY, 0), rect.height);
    setCropRect({
      x: Math.min(curX, cropStartPos.x),
      y: Math.min(curY, cropStartPos.y),
      w: Math.abs(curX - cropStartPos.x),
      h: Math.abs(curY - cropStartPos.y)
    });
  };

  const onCropMouseUp = () => setIsDrawingCrop(false);

  const confirmCropAndUpload = async () => {
    if (!cropModal.file || !slug) return;
    setIsUploading(true);
    let uploadBlob: Blob = cropModal.file;
    if (cropRect.w > 10 && cropRect.h > 10) {
      const imgElem = document.getElementById('crop-source-img') as HTMLImageElement;
      if (imgElem) {
        const displayRect = imgElem.getBoundingClientRect();
        const scaleX = imgElem.naturalWidth / displayRect.width;
        const scaleY = imgElem.naturalHeight / displayRect.height;
        const canvas = document.createElement('canvas');
        canvas.width = cropRect.w * scaleX;
        canvas.height = cropRect.h * scaleY;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(imgElem, cropRect.x * scaleX, cropRect.y * scaleY, cropRect.w * scaleX, cropRect.h * scaleY, 0, 0, canvas.width, canvas.height);
        uploadBlob = await new Promise<Blob>(resolve => canvas.toBlob(b => resolve(b!), cropModal.file!.type, 0.9));
      }
    }
    const fd = new FormData();
    fd.append('file', uploadBlob, cropModal.file.name);
    fd.append('type', 'editor-media');
    fd.append('customName', `${slug}-inline-${Date.now()}`);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      if (res.ok) {
        const data = await res.json();
        const url = data.url?.startsWith('http') ? data.url : `/${data.url}`;
        restoreRange();
        const imgHtml = `<br/><div class="image-resize-wrapper relative inline-block group" style="display:inline-block; position:relative;"><img src="${url}" alt="image" style="max-width:100%; height:auto; border-radius:12px; margin:5px auto; display:block; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);" class="resize-enabled" /><div class="resize-handler se" style="position:absolute; bottom:-6px; right:-6px; width:12px; height:12px; background-color:#3b82f6; border-radius:50%; border:2px solid white; z-index:20; cursor:se-resize;"></div></div><br/>`;
        document.execCommand('insertHTML', false, imgHtml);
        handleInput();
      } else alert('خطا در آپلود عکس');
    } catch (err) { alert('خطا در اتصال به سرور'); }
    setIsUploading(false);
    setCropModal({ isOpen: false, src: '', file: null });
  };

  const toggleCodeView = () => {
    if (isCodeView) {
      setIsCodeView(false);
      if (editorRef.current) {
        editorRef.current.innerHTML = htmlContent;
        attachResizeHandlers(editorRef.current);
        lastSentValue.current = htmlContent;
        onChange?.(htmlContent);
      }
    } else {
      if (editorRef.current) {
        const cur = editorRef.current.innerHTML;
        setHtmlContent(cur);
        lastSentValue.current = cur;
        onChange?.(cur);
      }
      setIsCodeView(true);
    }
  };

  const ToolbarButton = ({ command, icon, title }: { command: string; icon: React.ReactNode; title: string }) => {
    const isActive = activeStyles[command];
    return (
      <button
        type="button"
        onMouseDown={e => { e.preventDefault(); exec(command); }}
        title={title}
        disabled={isCodeView}
        className={`p-2 rounded-lg transition-colors flex items-center justify-center ${isCodeView ? 'opacity-50 cursor-not-allowed text-gray-400' : isActive ? 'bg-blue-100 text-blue-700 border border-blue-200 shadow-inner' : 'text-gray-600 hover:bg-gray-100 hover:text-blue-600'}`}
      >
        {icon}
      </button>
    );
  };

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm flex flex-col focus-within:ring-2 focus-within:ring-blue-500 transition-all relative">
      <style>{`
        .custom-editor-content ul { list-style-type: disc !important; padding-right: 2rem !important; margin: 0.5rem 0; }
        .custom-editor-content ol { list-style-type: decimal !important; padding-right: 2rem !important; margin: 0.5rem 0; }
        .resize-handler:hover { transform: scale(1.2); }
      `}</style>

      {/* Link Modal */}
      {linkModal.isOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><LinkIcon size={20} className="text-blue-500" /> ایجاد لینک</h3>
            <input type="text" dir="ltr" value={linkModal.url} onChange={e => setLinkModal({ ...linkModal, url: e.target.value })} className="w-full border rounded-xl p-3 mb-6 bg-gray-50" placeholder="https://" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setLinkModal({ ...linkModal, isOpen: false })} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-xl">لغو</button>
              <button onClick={confirmLink} className="px-4 py-2 bg-blue-600 text-white rounded-xl">اعمال</button>
            </div>
          </div>
        </div>
      )}

      {/* Table Modal */}
      {tableModal.isOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-4">ابعاد جدول</h3>
            <div className="flex gap-4 mb-6">
              <div><label className="text-xs">سطرها</label><input type="number" min={1} value={tableModal.rows} onChange={e => setTableModal({ ...tableModal, rows: parseInt(e.target.value) || 1 })} className="w-full border rounded-xl p-2" /></div>
              <div><label className="text-xs">ستون‌ها</label><input type="number" min={1} value={tableModal.cols} onChange={e => setTableModal({ ...tableModal, cols: parseInt(e.target.value) || 1 })} className="w-full border rounded-xl p-2" /></div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setTableModal({ ...tableModal, isOpen: false })} className="px-4 py-2 text-gray-500">لغو</button>
              <button onClick={confirmTable} className="px-4 py-2 bg-blue-600 text-white rounded-xl">رسم جدول</button>
            </div>
          </div>
        </div>
      )}

      {/* Crop Modal */}
      {cropModal.isOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-4xl shadow-2xl flex flex-col max-h-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2 text-gray-900"><Crop size={20} className="text-blue-500" /> برش تصویر</h3>
              <button onClick={() => setCropModal({ isOpen: false, src: '', file: null })} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
            </div>
            <p className="text-sm text-gray-600 mb-4 bg-blue-50 p-3 rounded-lg border border-blue-100">با کلیک و کشیدن موس روی تصویر، ناحیه مورد نظر را انتخاب کنید.</p>
            <div
              className="relative overflow-auto bg-gray-100 rounded-2xl flex justify-center items-center border-2 border-dashed p-2 cursor-crosshair"
              onMouseDown={onCropMouseDown}
              onMouseMove={onCropMouseMove}
              onMouseUp={onCropMouseUp}
              onMouseLeave={onCropMouseUp}
            >
              <div className="relative inline-block">
                <img id="crop-source-img" src={cropModal.src} alt="crop preview" className="max-w-full max-h-[50vh] object-contain pointer-events-none" draggable={false} />
                {cropRect.w > 0 && cropRect.h > 0 && (
                  <div className="absolute border-2 border-blue-500 bg-blue-500/30 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] pointer-events-none" style={{ left: cropRect.x, top: cropRect.y, width: cropRect.w, height: cropRect.h }} />
                )}
              </div>
            </div>
            <div className="flex justify-between items-center mt-4">
              <div></div>
              <div className="flex gap-3">
                <button onClick={() => setCropModal({ isOpen: false, src: '', file: null })} className="px-6 py-2 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition">لغو</button>
                <button onClick={confirmCropAndUpload} disabled={isUploading} className="px-6 py-2 bg-blue-600 text-white rounded-xl flex items-center gap-2 transition shadow-sm">
                  {isUploading ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                  {isUploading ? 'در حال آپلود...' : 'تأیید برش و آپلود'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-gray-50 border-b border-gray-200 p-2 flex flex-wrap items-center gap-1" onMouseDown={e => { const t = e.target as HTMLElement; if (t.tagName !== 'SELECT' && t.tagName !== 'INPUT' && t.tagName !== 'TEXTAREA') e.preventDefault(); }}>
        <select value={currentFont} onChange={e => exec('fontName', e.target.value)} disabled={isCodeView} className="p-1 border rounded text-sm bg-white"><option value="Vazir">وزیر</option><option value="Tahoma">تاهوما</option><option value="Arial">آریال</option></select>
        <div className="flex items-center gap-1 bg-white border rounded p-0.5">
          <button onMouseDown={e => { e.preventDefault(); changeFontSize(1); }} disabled={isCodeView}><span className="font-bold text-base">A</span><span className="text-xs">+</span></button>
          <button onMouseDown={e => { e.preventDefault(); changeFontSize(-1); }} disabled={isCodeView}><span className="font-bold text-sm">A</span><span className="text-xs">-</span></button>
        </div>
        <div className="relative flex items-center border rounded p-1 bg-white"><Palette size={16} /><input type="color" onChange={e => exec('foreColor', e.target.value)} disabled={isCodeView} className="w-6 h-6 border-0" /></div>
        <button onMouseDown={e => { e.preventDefault(); exec('removeFormat'); }} disabled={isCodeView} className="p-2 text-red-500"><Eraser size={16} /></button>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <ToolbarButton command="bold" icon={<Bold size={16} />} title="Bold" />
        <ToolbarButton command="italic" icon={<Italic size={16} />} title="Italic" />
        <ToolbarButton command="underline" icon={<Underline size={16} />} title="Underline" />
        <ToolbarButton command="strikeThrough" icon={<Strikethrough size={16} />} title="Strike" />
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <ToolbarButton command="justifyRight" icon={<AlignRight size={16} />} title="Right" />
        <ToolbarButton command="justifyCenter" icon={<AlignCenter size={16} />} title="Center" />
        <ToolbarButton command="justifyLeft" icon={<AlignLeft size={16} />} title="Left" />
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <ToolbarButton command="insertUnorderedList" icon={<List size={16} />} title="Bullet List" />
        <ToolbarButton command="insertOrderedList" icon={<ListOrdered size={16} />} title="Numbered List" />
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <button disabled={isCodeView || !hasSelection} onMouseDown={e => { e.preventDefault(); if (hasSelection) { saveRange(); setLinkModal({ ...linkModal, isOpen: true }); } }} className={`p-2 ${(!hasSelection || isCodeView) ? 'opacity-40' : 'hover:bg-gray-100'}`}><LinkIcon size={16} /></button>
        <button disabled={isCodeView} onMouseDown={e => { e.preventDefault(); saveRange(); setTableModal({ ...tableModal, isOpen: true }); }} className="p-2 hover:bg-gray-100"><Table size={16} /></button>
        <label className={`p-2 hover:bg-gray-100 cursor-pointer ${isCodeView ? 'opacity-50' : ''}`}><ImageIcon size={16} /><input type="file" accept="image/*" onChange={handleImageFileSelect} disabled={isCodeView} className="hidden" /></label>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <button onClick={toggleCodeView} className={`p-2 rounded text-sm ${isCodeView ? 'bg-amber-100 text-amber-700' : 'hover:bg-gray-100'}`}>{isCodeView ? <Eye size={16} /> : <Code size={16} />}</button>
      </div>

      {/* Editor Area */}
      <div className="relative min-h-[450px]">
        <textarea value={htmlContent} onChange={e => { setHtmlContent(e.target.value); lastSentValue.current = e.target.value; onChange?.(e.target.value); }} className={`absolute inset-0 w-full h-full p-6 outline-none bg-gray-900 text-green-400 font-mono text-sm resize-none ${isCodeView ? 'block' : 'hidden'}`} dir="ltr" />
        <div
          ref={editorRef}
          contentEditable={!isCodeView}
          suppressContentEditableWarning
          onInput={handleInput}
          onBlur={handleInput}
          onKeyUp={updateFormatting}
          onMouseUp={updateFormatting}
          className={`custom-editor-content absolute inset-0 w-full h-full p-6 outline-none prose max-w-none text-gray-800 leading-loose overflow-y-auto ${!isCodeView ? 'block' : 'hidden'}`}
          dir="rtl"
          style={{ direction: 'rtl', textAlign: 'right' }}
        />
      </div>
    </div>
  );
}