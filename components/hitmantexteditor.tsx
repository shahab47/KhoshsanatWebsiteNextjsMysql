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

const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;
const GRAB_TOLERANCE_PX = 4;

export default function HitmanTextEditor({ value = '', onChange, slug = '' }: HitmanTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const lastSentValue = useRef<string>(value);
  const [activeStyles, setActiveStyles] = useState<Record<string, boolean>>({});
  const [currentFont, setCurrentFont] = useState('Vazir');
  const [isCodeView, setIsCodeView] = useState(false);
  const [htmlContent, setHtmlContent] = useState(value);
  const [savedRange, setSavedRange] = useState<Range | null>(null);
  const [hasSelection, setHasSelection] = useState(false);

  const [mouseClient, setMouseClient] = useState<{ x: number; y: number } | null>(null);
  const [mousePage, setMousePage] = useState<{ x: number; y: number } | null>(null);
  const [distanceToHandler, setDistanceToHandler] = useState<number | null>(null);
  const [nearestHandlerType, setNearestHandlerType] = useState<string | null>(null);

  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandlerType, setResizeHandlerType] = useState<string | null>(null);
  const [resizeDelta, setResizeDelta] = useState<{ dx: number; dy: number } | null>(null);
  const [resizeStartPage, setResizeStartPage] = useState<{ x: number; y: number } | null>(null);
  const [imageCorners, setImageCorners] = useState<{
    topLeft: { x: number; y: number };
    topRight: { x: number; y: number };
    bottomLeft: { x: number; y: number };
    bottomRight: { x: number; y: number };
  } | null>(null);

  const [selectedWrapper, setSelectedWrapper] = useState<HTMLElement | null>(null);
  const [selectedBadgePos, setSelectedBadgePos] = useState<{ x: number; y: number } | null>(null);

  const [tableModal, setTableModal] = useState({ isOpen: false, rows: 3, cols: 3 });
  const [linkModal, setLinkModal] = useState({ isOpen: false, url: 'https://' });
  const [cropModal, setCropModal] = useState({ isOpen: false, src: '', file: null as File | null });
  const [cropRect, setCropRect] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [isDrawingCrop, setIsDrawingCrop] = useState(false);
  const [cropStartPos, setCropStartPos] = useState({ x: 0, y: 0 });
  const [isUploading, setIsUploading] = useState(false);

  const resizeDataRef = useRef<{
    wrapper: HTMLElement;
    pos: string;
    startCenterX: number;            // مختصات مرکز اولیه نسبت به viewport
    startCenterY: number;
    originalRect: DOMRect;           // bounding rect اولیه wrapper
    originalWidth: number;
    originalHeight: number;
    aspectRatio: number;
    imgEl: HTMLImageElement;
  } | null>(null);

  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const addDebugLog = useCallback((msg: string) => {
    setDebugLogs(prev => [...prev.slice(-20), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);

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

  const updateImageCornersFromDOM = useCallback(() => {
    if (!pageRef.current) return;
    const wrappers = pageRef.current.querySelectorAll('.image-resize-wrapper');
    if (wrappers.length > 0) {
      const firstWrapper = wrappers[0] as HTMLElement;
      const rect = firstWrapper.getBoundingClientRect();
      const pageRect = pageRef.current.getBoundingClientRect();
      setImageCorners({
        topLeft: { x: Math.round(rect.left - pageRect.left), y: Math.round(rect.top - pageRect.top) },
        topRight: { x: Math.round(rect.right - pageRect.left), y: Math.round(rect.top - pageRect.top) },
        bottomLeft: { x: Math.round(rect.left - pageRect.left), y: Math.round(rect.bottom - pageRect.top) },
        bottomRight: { x: Math.round(rect.right - pageRect.left), y: Math.round(rect.bottom - pageRect.top) },
      });
    } else {
      setImageCorners(null);
    }
  }, []);

  const attachResizeHandlers = useCallback((container: HTMLElement) => {
    const images = container.querySelectorAll('img:not(.resize-enabled)');
    addDebugLog(`attachResizeHandlers: ${images.length} تصویر بدون resize-enabled پیدا شد.`);

    images.forEach((img) => {
      const imgEl = img as HTMLImageElement;
      const existingWrapper = imgEl.closest('.image-resize-wrapper');
      if (existingWrapper) {
        // حذف wrapper قدیمی و برگرداندن img به جای آن
        existingWrapper.parentNode?.insertBefore(imgEl, existingWrapper);
        existingWrapper.remove();
      }

      const wrapper = document.createElement('div');
      wrapper.className = 'image-resize-wrapper relative inline-block group';
      wrapper.style.position = 'relative';   // برای اعمال left/top
      wrapper.style.display = 'inline-block';
      wrapper.style.userSelect = 'none';
      wrapper.style.left = '0px';   // صفر اولیه
      wrapper.style.top = '0px';
      imgEl.parentNode?.insertBefore(wrapper, imgEl);
      wrapper.appendChild(imgEl);

      const currentWidth = imgEl.getBoundingClientRect().width || 300;
      imgEl.style.width = `${currentWidth}px`;
      wrapper.style.width = `${currentWidth}px`;
      imgEl.style.height = 'auto';
      wrapper.style.height = 'auto';

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
        handle.style.transition = 'opacity 0.2s';
        // کرسر آبی سفارشی
        handle.style.cursor = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='10' fill='none' stroke='%232563EB' stroke-width='2'/%3E%3Cpath d='M12 4v4M12 16v4M4 12h4M16 12h4' stroke='%232563EB' stroke-width='2'/%3E%3C/svg%3E") 12 12, auto`;

        switch (pos) {
          case 'nw': handle.style.top = '-6px'; handle.style.left = '-6px'; break;
          case 'ne': handle.style.top = '-6px'; handle.style.right = '-6px'; break;
          case 'sw': handle.style.bottom = '-6px'; handle.style.left = '-6px'; break;
          case 'se': handle.style.bottom = '-6px'; handle.style.right = '-6px'; break;
        }
        wrapper.appendChild(handle);
      });

      imgEl.classList.add('resize-enabled');
      addDebugLog(`پردازش تصویر: ${imgEl.src.substring(0, 50)}... (${imgEl.naturalWidth}x${imgEl.naturalHeight})`);
    });
  }, [addDebugLog]);

  // مدیریت انتخاب تصویر
  useEffect(() => {
    const allWrappers = pageRef.current?.querySelectorAll('.image-resize-wrapper');
    allWrappers?.forEach(w => {
      w.classList.remove('selected');
      const handlers = w.querySelectorAll('.resize-handler');
      handlers.forEach(h => (h as HTMLElement).style.opacity = '');
    });

    if (selectedWrapper && pageRef.current?.contains(selectedWrapper)) {
      selectedWrapper.classList.add('selected');
      const handlers = selectedWrapper.querySelectorAll('.resize-handler');
      handlers.forEach(h => (h as HTMLElement).style.opacity = '1');
      addDebugLog(`تصویر انتخاب شد: ${handlers.length} هندلر فعال`);

      const pageRect = pageRef.current!.getBoundingClientRect();
      const wrapperRect = selectedWrapper.getBoundingClientRect();
      setSelectedBadgePos({
        x: wrapperRect.left - pageRect.left,
        y: wrapperRect.top - pageRect.top - 10,
      });
    } else {
      setSelectedBadgePos(null);
    }
  }, [selectedWrapper, addDebugLog]);

  // کلیک روی برگه – شروع تغییر اندازه
  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;

    const onMouseDown = (e: MouseEvent) => {
      if (isCodeView) return;
      const pageRect = page.getBoundingClientRect();
      const pageX = e.clientX - pageRect.left;
      const pageY = e.clientY - pageRect.top;

      const handlers = page.querySelectorAll('.resize-handler');
      let minDist = Infinity;
      let closestHandler: HTMLElement | null = null;
      let closestPos: string | null = null;
      let closestWrapper: HTMLElement | null = null;

      handlers.forEach(h => {
        const rect = h.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2 - pageRect.left;
        const centerY = rect.top + rect.height / 2 - pageRect.top;
        const dist = Math.hypot(pageX - centerX, pageY - centerY);
        if (dist < minDist) {
          minDist = dist;
          closestHandler = h as HTMLElement;
          closestPos = closestHandler.classList.contains('nw') ? 'nw' :
                       closestHandler.classList.contains('ne') ? 'ne' :
                       closestHandler.classList.contains('sw') ? 'sw' :
                       closestHandler.classList.contains('se') ? 'se' : null;
          closestWrapper = h.closest('.image-resize-wrapper') as HTMLElement;
        }
      });

      addDebugLog(`mousedown: فاصله ${handlers.length > 0 ? minDist.toFixed(1) : '∞'}px`);

      if (minDist <= GRAB_TOLERANCE_PX && closestHandler && closestPos && closestWrapper) {
        e.preventDefault();
        e.stopPropagation();
        addDebugLog(`→ شروع تغییر اندازه (${closestPos})`);

        const imgEl = closestWrapper.querySelector('img') as HTMLImageElement;
        if (imgEl) {
          const wrapperRect = closestWrapper.getBoundingClientRect();
          const centerX = wrapperRect.left + wrapperRect.width / 2 - pageRect.left;
          const centerY = wrapperRect.top + wrapperRect.height / 2 - pageRect.top;
          const aspect = wrapperRect.width / wrapperRect.height;

          resizeDataRef.current = {
            wrapper: closestWrapper,
            pos: closestPos,
            startCenterX: centerX,
            startCenterY: centerY,
            originalRect: wrapperRect.clone() as DOMRect,
            originalWidth: wrapperRect.width,
            originalHeight: wrapperRect.height,
            aspectRatio: aspect,
            imgEl,
          };

          addDebugLog(`شروع: مرکز=(${centerX.toFixed(1)},${centerY.toFixed(1)}) اندازه=${wrapperRect.width}x${wrapperRect.height}`);

          setIsResizing(true);
          setResizeHandlerType(closestPos);
          setResizeStartPage({ x: pageX, y: pageY });
          setResizeDelta({ dx: 0, dy: 0 });
          if (editorRef.current) {
            editorRef.current.setAttribute('contenteditable', 'false');
          }
          setSelectedWrapper(closestWrapper);
        }
      } else {
        const target = e.target as HTMLElement;
        const wrapperUnderClick = target.closest('.image-resize-wrapper') as HTMLElement | null;
        if (wrapperUnderClick) {
          addDebugLog('→ انتخاب تصویر');
          setSelectedWrapper(wrapperUnderClick);
        } else {
          addDebugLog('→ کلیک خارج تصاویر');
          setSelectedWrapper(null);
        }
      }
    };

    page.addEventListener('mousedown', onMouseDown);
    return () => page.removeEventListener('mousedown', onMouseDown);
  }, [isCodeView, addDebugLog]);

  // حرکت و رهاسازی - تغییر اندازه با مرکز ثابت و ذخیره‌ی موقعیت نهایی
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!resizeDataRef.current || !pageRef.current) return;
      const { wrapper, pos, startCenterX, startCenterY, originalRect, originalWidth, originalHeight, aspectRatio, imgEl } = resizeDataRef.current;
      const pageRect = pageRef.current.getBoundingClientRect();
      const mouseX = e.clientX - pageRect.left;
      const mouseY = e.clientY - pageRect.top;

      let newWidth: number;
      const minSize = 50;

      // محاسبه عرض جدید بر اساس جهت کشیدن
      switch (pos) {
        case 'se': newWidth = Math.max(minSize, 2 * (mouseX - startCenterX)); break;
        case 'sw': newWidth = Math.max(minSize, 2 * (startCenterX - mouseX)); break;
        case 'ne': newWidth = Math.max(minSize, 2 * (mouseX - startCenterX)); break;
        case 'nw': newWidth = Math.max(minSize, 2 * (startCenterX - mouseX)); break;
        default: newWidth = originalWidth;
      }

      newWidth = Math.min(newWidth, A4_WIDTH_PX - 20);
      const newHeight = newWidth / aspectRatio;

      // محاسبه جابجایی بالا‑چپ جدید برای حفظ مرکز
      const newLeft = startCenterX - newWidth / 2;
      const newTop = startCenterY - newHeight / 2;
      const offsetX = newLeft - originalRect.left;
      const offsetY = newTop - originalRect.top;

      // اعمال تغییرات روی استایل‌ها (ماندگار در HTML)
      imgEl.style.width = `${newWidth}px`;
      imgEl.style.height = `${newHeight}px`;
      wrapper.style.width = `${newWidth}px`;
      wrapper.style.height = `${newHeight}px`;
      wrapper.style.left = `${offsetX}px`;
      wrapper.style.top = `${offsetY}px`;

      requestAnimationFrame(() => {
        setResizeDelta({ dx: mouseX - startCenterX, dy: mouseY - startCenterY });
        updateImageCornersFromDOM();
        addDebugLog(`حرکت: اندازه=${Math.round(newWidth)}x${Math.round(newHeight)} offset=(${offsetX.toFixed(1)},${offsetY.toFixed(1)})`);
      });
    };

    const onMouseUp = () => {
      if (!resizeDataRef.current) return;
      const { wrapper, imgEl, originalRect } = resizeDataRef.current;

      // موقعیت نهایی را به صورت ماندگار نگه می‌داریم (left/top پاک نمی‌شوند)
      addDebugLog(`پایان تغییر اندازه: اندازه=${wrapper.style.width}x${wrapper.style.height} left=${wrapper.style.left} top=${wrapper.style.top}`);

      resizeDataRef.current = null;

      if (editorRef.current && !isCodeView) {
        editorRef.current.setAttribute('contenteditable', 'true');
      }
      setIsResizing(false);
      setResizeHandlerType(null);
      setResizeStartPage(null);
      setResizeDelta(null);
      updateImageCornersFromDOM();
      triggerChange();   // اینجا innerHTML ذخیره می‌شود که حاوی left/top است
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      if (editorRef.current) {
        editorRef.current.setAttribute('contenteditable', 'true');
      }
    };
  }, [isCodeView, triggerChange, updateImageCornersFromDOM, addDebugLog]);

  const handlePageMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!pageRef.current) return;
    const pageRect = pageRef.current.getBoundingClientRect();
    const pageX = Math.round(e.clientX - pageRect.left);
    const pageY = Math.round(e.clientY - pageRect.top);
    setMouseClient({ x: e.clientX, y: e.clientY });
    setMousePage({ x: pageX, y: pageY });

    const handlers = pageRef.current.querySelectorAll('.resize-handler');
    let minDist = Infinity;
    let closestType: string | null = null;
    handlers.forEach(h => {
      const rect = h.getBoundingClientRect();
      const cx = rect.left + rect.width / 2 - pageRect.left;
      const cy = rect.top + rect.height / 2 - pageRect.top;
      const dist = Math.hypot(pageX - cx, pageY - cy);
      if (dist < minDist) {
        minDist = dist;
        closestType = (h as HTMLElement).classList.contains('nw') ? 'nw' :
                     (h as HTMLElement).classList.contains('ne') ? 'ne' :
                     (h as HTMLElement).classList.contains('sw') ? 'sw' :
                     (h as HTMLElement).classList.contains('se') ? 'se' : null;
      }
    });
    setDistanceToHandler(handlers.length > 0 ? Math.round(minDist) : null);
    setNearestHandlerType(closestType);

    if (!isResizing) updateImageCornersFromDOM();
  };

  const handlePageMouseLeave = () => {
    setMouseClient(null);
    setMousePage(null);
    setDistanceToHandler(null);
    setNearestHandlerType(null);
  };

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      triggerChange();
      attachResizeHandlers(editorRef.current);
    }
  }, [triggerChange, attachResizeHandlers]);

  useEffect(() => {
    if (editorRef.current && value !== lastSentValue.current) {
      editorRef.current.innerHTML = value || '';
      setHtmlContent(value || '');
      lastSentValue.current = value || '';
      attachResizeHandlers(editorRef.current);
    }
  }, [value, attachResizeHandlers]);

  useEffect(() => {
    document.execCommand('defaultParagraphSeparator', false, 'p');
    document.execCommand('styleWithCSS', false, 'false');
    if (editorRef.current) attachResizeHandlers(editorRef.current);
  }, [attachResizeHandlers]);

  const updateFormatting = useCallback(() => {
    if (!editorRef.current || isCodeView) return;
    const formats = ['bold', 'italic', 'underline', 'strikeThrough',
      'justifyLeft', 'justifyCenter', 'justifyRight',
      'insertUnorderedList', 'insertOrderedList'];
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
    if (isCodeView) return false;
    const sel = window.getSelection();
    if (!sel || !editorRef.current) return false;
    if (savedRange && editorRef.current.contains(savedRange.commonAncestorContainer)) {
      sel.removeAllRanges();
      sel.addRange(savedRange);
      editorRef.current.focus();
      return true;
    } else {
      const newRange = document.createRange();
      newRange.selectNodeContents(editorRef.current);
      newRange.collapse(false);
      sel.removeAllRanges();
      sel.addRange(newRange);
      editorRef.current.focus();
      return true;
    }
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
        document.execCommand('insertHTML', false, `<br/><img src="${url}" alt="image" style="max-width:100%; height:auto; border-radius:12px; margin:5px auto; display:block; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);" /><br/>`);
        handleInput();
        if (editorRef.current) {
          const imgs = editorRef.current.querySelectorAll('img.resize-enabled');
          if (imgs.length > 0) {
            const lastImg = imgs[imgs.length - 1];
            const wrapper = lastImg.closest('.image-resize-wrapper') || lastImg;
            wrapper.scrollIntoView({ behavior: 'smooth', block: 'center' });
            if (wrapper instanceof HTMLElement) setSelectedWrapper(wrapper);
          }
        }
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
        className={`p-2 rounded-lg transition-colors flex items-center justify-center ${
          isCodeView ? 'opacity-50 cursor-not-allowed text-gray-400' :
          isActive ? 'bg-blue-100 text-blue-700 border border-blue-200 shadow-inner' : 'text-gray-600 hover:bg-gray-100 hover:text-blue-600'
        }`}
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
        .resize-handler {
          opacity: 0;
          transition: opacity 0.2s;
        }
        .image-resize-wrapper.group:hover .resize-handler {
          opacity: 1;
        }
        .image-resize-wrapper.selected .resize-handler {
          opacity: 1;
        }
        .resize-handler:hover {
          transform: scale(1.2);
        }
      `}</style>

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
      {cropModal.isOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-4xl shadow-2xl flex flex-col max-h-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2 text-gray-900"><Crop size={20} className="text-blue-500" /> برش تصویر</h3>
              <button onClick={() => setCropModal({ isOpen: false, src: '', file: null })} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
            </div>
            <p className="text-sm text-gray-600 mb-4 bg-blue-50 p-3 rounded-lg border border-blue-100">با کلیک و کشیدن موس روی تصویر، ناحیه مورد نظر را انتخاب کنید.</p>
            <div className="relative overflow-auto bg-gray-100 rounded-2xl flex justify-center items-center border-2 border-dashed p-2 cursor-crosshair" onMouseDown={onCropMouseDown} onMouseMove={onCropMouseMove} onMouseUp={onCropMouseUp} onMouseLeave={onCropMouseUp}>
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

      <div className="relative flex-1 bg-gray-100 p-4 flex justify-center overflow-auto" style={{ minHeight: '60vh' }}>
        <div
          ref={pageRef}
          onMouseMove={handlePageMouseMove}
          onMouseLeave={handlePageMouseLeave}
          className="bg-white shadow-2xl relative"
          style={{
            width: `${A4_WIDTH_PX}px`,
            minHeight: `${A4_HEIGHT_PX}px`,
            maxWidth: '100%',
            margin: '0 auto',
            padding: '60px 72px',
            boxSizing: 'border-box',
            borderRadius: '4px',
          }}
        >
          {selectedBadgePos && (
            <div className="absolute z-40 bg-blue-600 text-white text-xs px-2 py-1 rounded-lg shadow pointer-events-none" style={{ left: selectedBadgePos.x - 30, top: selectedBadgePos.y - 25 }}>انتخاب شد</div>
          )}

          <textarea
            value={htmlContent}
            onChange={e => { setHtmlContent(e.target.value); lastSentValue.current = e.target.value; onChange?.(e.target.value); }}
            className={`absolute inset-0 w-full h-full outline-none bg-gray-900 text-green-400 font-mono text-sm resize-none ${isCodeView ? 'block' : 'hidden'}`}
            dir="ltr"
          />
          <div
            ref={editorRef}
            contentEditable={!isCodeView}
            suppressContentEditableWarning
            onInput={handleInput}
            onBlur={handleInput}
            onKeyUp={updateFormatting}
            onMouseUp={updateFormatting}
            className={`custom-editor-content w-full h-full outline-none prose max-w-none text-gray-800 leading-loose ${!isCodeView ? 'block' : 'hidden'}`}
            dir="rtl"
            style={{ direction: 'rtl', textAlign: 'right', minHeight: `${A4_HEIGHT_PX - 120}px` }}
          />
        </div>
      </div>

      {mouseClient && mousePage && (
        <div className="fixed pointer-events-none z-50 bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg border border-gray-700" style={{ left: mouseClient.x + 15, top: mouseClient.y + 15 }}>
          <div>X: {mousePage.x} , Y: {mousePage.y}</div>
          {distanceToHandler !== null && <div className="text-gray-300 mt-1">فاصله تا هندلر {nearestHandlerType}: {distanceToHandler}px</div>}
          {isResizing && resizeDelta && <div className="text-green-400 mt-1">Grab {resizeHandlerType} | ΔX:{resizeDelta.dx} , ΔY:{resizeDelta.dy}</div>}
        </div>
      )}

      <div className="bg-gray-900 text-white text-xs p-3 space-y-2">
        <div className="flex items-center gap-2"><span className="text-gray-400">📍 موس:</span><span>{mousePage ? `X: ${mousePage.x} , Y: ${mousePage.y}` : 'خارج'}</span></div>
        <div className="flex items-center gap-2"><span className="text-gray-400">📏 فاصله تا هندلر:</span><span>{distanceToHandler !== null ? `${distanceToHandler}px (${nearestHandlerType ?? '?'})` : 'بدون تصویر'}</span></div>
        <div className="flex items-center gap-2"><span className="text-gray-400">✋ وضعیت:</span><span>{isResizing ? `Grab (${resizeHandlerType}) | حرکت: dx=${resizeDelta?.dx ?? 0}, dy=${resizeDelta?.dy ?? 0}` : 'آزاد'}</span></div>
        <div className="flex items-start gap-2"><span className="text-gray-400">🖼️ گوشه‌های تصویر اول:</span><span>{imageCorners ? `TL(${imageCorners.topLeft.x},${imageCorners.topLeft.y})  TR(${imageCorners.topRight.x},${imageCorners.topRight.y})  BL(${imageCorners.bottomLeft.x},${imageCorners.bottomLeft.y})  BR(${imageCorners.bottomRight.x},${imageCorners.bottomRight.y})` : 'بدون تصویر'}</span></div>
        <div className="flex items-center gap-2"><span className="text-gray-400">🖱️ تصویر انتخاب‌شده:</span><span>{selectedWrapper ? 'بله' : 'خیر'}</span></div>
        <div className="border-t border-gray-700 pt-1 mt-1">
          <span className="text-gray-400">🔍 لاگ رویدادها:</span>
          <div className="max-h-24 overflow-y-auto mt-1 space-y-0.5 text-gray-300">
            {debugLogs.map((log, i) => (<div key={i} className="font-mono">{log}</div>))}
          </div>
        </div>
      </div>
    </div>
  );
}