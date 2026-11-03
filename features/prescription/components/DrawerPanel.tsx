'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Icone } from '@/components/ui/Icone';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: string;
  wide?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export default function DrawerPanel({ isOpen, onClose, title, subtitle, icon, children, footer, wide }: Props) {
  // Largeur des modals : 1060px en mode large (au lieu de 900) et 620px sinon.
  // Les formulaires larges sont en deux colonnes : a 900px chaque colonne
  // tombait sous 430px, ce qui comprimait la rangee Frequence / Valeur / Duree.
  const modalRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ w: wide ? 1060 : 620, h: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isCentered, setIsCentered] = useState(true);
  const dragOffset = useRef({ x: 0, y: 0 });
  const resizeDir = useRef<string>('');

  useEffect(() => {
    if (!isOpen) return;
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Reset to center when opening
  useEffect(() => {
    if (isOpen) {
      setIsCentered(true);
      setPosition({ x: 0, y: 0 });
      setSize({ w: wide ? 1060 : 620, h: 0 });
    }
  }, [isOpen]);

  const handleMouseDownDrag = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    const modal = modalRef.current;
    if (!modal) return;
    const rect = modal.getBoundingClientRect();
    setIsDragging(true);
    setIsCentered(false);
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setPosition({ x: rect.left, y: rect.top });
    e.preventDefault();
  }, []);

  const handleMouseDownResize = useCallback((e: React.MouseEvent, dir: string) => {
    e.preventDefault();
    e.stopPropagation();
    const modal = modalRef.current;
    if (!modal) return;
    const rect = modal.getBoundingClientRect();
    setIsResizing(true);
    setIsCentered(false);
    resizeDir.current = dir;
    setPosition({ x: rect.left, y: rect.top });
    setSize({ w: rect.width, h: rect.height });
    dragOffset.current = { x: e.clientX, y: e.clientY };
  }, []);

  useEffect(() => {
    if (!isDragging && !isResizing) return;

    function onMouseMove(e: MouseEvent) {
      if (isDragging) {
        const x = e.clientX - dragOffset.current.x;
        const y = e.clientY - dragOffset.current.y;
        setPosition({ x, y });
      }
      if (isResizing) {
        const dx = e.clientX - dragOffset.current.x;
        const dy = e.clientY - dragOffset.current.y;
        const dir = resizeDir.current;
        setSize(prev => {
          let nw = prev.w;
          let nh = prev.h || modalRef.current?.getBoundingClientRect().height || 400;
          if (dir.includes('e')) nw = Math.max(360, prev.w + dx);
          if (dir.includes('w')) nw = Math.max(360, prev.w - dx);
          if (dir.includes('s')) nh = Math.max(300, nh + dy);
          if (dir.includes('n')) nh = Math.max(300, nh - dy);
          return { w: nw, h: nh };
        });
        if (dir.includes('w')) {
          setPosition(prev => ({ ...prev, x: prev.x + dx }));
        }
        if (dir.includes('n')) {
          setPosition(prev => ({ ...prev, y: prev.y + dy }));
        }
        dragOffset.current = { x: e.clientX, y: e.clientY };
      }
    }

    function onMouseUp() {
      setIsDragging(false);
      setIsResizing(false);
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDragging, isResizing]);

  if (!isOpen) return null;

  const modalStyle: React.CSSProperties = isCentered
    ? {
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        width: `min(${size.w}px, 92vw)`,
        maxHeight: '88vh',
      }
    : {
        left: position.x,
        top: position.y,
        width: size.w,
        maxHeight: '88vh',
      };

  const resizeHandleStyle = (dir: string): React.CSSProperties => {
    const base: React.CSSProperties = { position: 'absolute', zIndex: 10, background: 'transparent' };
    if (dir === 'n') return { ...base, top: -4, left: 8, right: 8, height: 8, cursor: 'ns-resize' };
    if (dir === 's') return { ...base, bottom: -4, left: 8, right: 8, height: 8, cursor: 'ns-resize' };
    if (dir === 'w') return { ...base, left: -4, top: 8, bottom: 8, width: 8, cursor: 'ew-resize' };
    if (dir === 'e') return { ...base, right: -4, top: 8, bottom: 8, width: 8, cursor: 'ew-resize' };
    if (dir === 'nw') return { ...base, top: -4, left: -4, width: 14, height: 14, cursor: 'nwse-resize' };
    if (dir === 'ne') return { ...base, top: -4, right: -4, width: 14, height: 14, cursor: 'nesw-resize' };
    if (dir === 'sw') return { ...base, bottom: -4, left: -4, width: 14, height: 14, cursor: 'nesw-resize' };
    if (dir === 'se') return { ...base, bottom: -4, right: -4, width: 14, height: 14, cursor: 'nwse-resize' };
    return base;
  };

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.4)',
          zIndex: 1200,
          animation: 'fadeIn 0.2s ease',
        }}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        style={{
          position: 'fixed',
          ...modalStyle,
          background: 'var(--card)',
          borderRadius: 16,
          zIndex: 1210,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
          animation: isCentered ? 'modalIn 0.25s ease' : 'none',
        }}
      >
        {/* Resize handles */}
        {['n', 's', 'w', 'e', 'nw', 'ne', 'sw', 'se'].map(dir => (
          <div key={dir} style={resizeHandleStyle(dir)}
            onMouseDown={e => handleMouseDownResize(e, dir)} />
        ))}

        {/* Header — draggable */}
        <div
          onMouseDown={handleMouseDownDrag}
          style={{
            flexShrink: 0,
            padding: '14px 20px',
            borderBottom: '1px solid var(--bdr)',
            background: 'var(--navy-lt)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderRadius: '16px 16px 0 0',
            cursor: isDragging ? 'grabbing' : 'grab',
            userSelect: 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
            {icon && (
              <Icone nom={icon} style={{ fontSize: 22, color: 'var(--navy)', flexShrink: 0 }} />
            )}
            <div style={{ minWidth: 0 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--navy)' }}>{title}</h3>
              {subtitle && (
                <p style={{ margin: 0, fontSize: 11, color: 'var(--txt3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, marginLeft: 8 }}>
            {!isCentered && (
              <button
                onClick={() => { setIsCentered(true); setPosition({ x: 0, y: 0 }); setSize({ w: wide ? 1060 : 620, h: 0 }); }}
                title="Recentrer"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--txt3)', padding: 4, borderRadius: 4,
                }}
              >
                <Icone nom="center_focus_strong" style={{ fontSize: 18 }} />
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Fermer"
              style={{
                background: 'rgba(0,0,0,.06)', border: 'none', cursor: 'pointer',
                color: 'var(--txt3)', padding: 4, borderRadius: 6, width: 28, height: 28,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all .15s',
              }}
            >
              <Icone nom="close" style={{ fontSize: 20 }} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 20px',
          }}
        >
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            style={{
              flexShrink: 0,
              padding: '14px 20px',
              borderTop: '1px solid var(--bdr)',
              background: 'var(--surface-alt)',
              borderRadius: '0 0 16px 16px',
            }}
          >
            {footer}
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes modalIn {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </>
  );
}
