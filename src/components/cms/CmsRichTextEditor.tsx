'use client';

import {useEffect} from 'react';
import {EditorContent, useEditor} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Redo2,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
} from 'lucide-react';
import {cn} from '@/lib/cn';

type Props = {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  dir?: 'ltr' | 'rtl';
  placeholder?: string;
  className?: string;
};

function ToolbarButton({
  active,
  disabled,
  onClick,
  label,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onMouseDown={e => e.preventDefault()}
      onClick={onClick}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-lg text-foreground transition-colors',
        active ? 'bg-primary-soft text-primary-deep' : 'hover:bg-muted',
        disabled && 'cursor-not-allowed opacity-40',
      )}>
      {children}
    </button>
  );
}

export function CmsRichTextEditor({
  value,
  onChange,
  disabled,
  dir = 'ltr',
  placeholder = 'Start writing…',
  className,
}: Props) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {levels: [2, 3]},
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline',
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
      Placeholder.configure({placeholder}),
    ],
    content: value || '<p></p>',
    editable: !disabled,
    editorProps: {
      attributes: {
        dir,
        class: cn(
          'prose-cms min-h-[280px] max-w-none px-3 py-3 text-sm leading-relaxed text-foreground outline-none',
          '[&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-bold',
          '[&_h3]:mb-2 [&_h3]:mt-3 [&_h3]:text-base [&_h3]:font-semibold',
          '[&_p]:mb-3 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:ps-5',
          '[&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:ps-5',
          '[&_a]:text-primary [&_a]:underline',
          '[&_table]:mb-3 [&_table]:w-full [&_table]:border-collapse',
          '[&_th]:border [&_th]:border-border [&_th]:bg-muted/50 [&_th]:px-2 [&_th]:py-1 [&_th]:text-start',
          '[&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1',
        ),
      },
    },
    onUpdate: ({editor: current}) => {
      onChange(current.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const next = value || '<p></p>';
    if (current !== next) {
      editor.commands.setContent(next, {emitUpdate: false});
    }
  }, [value, editor]);

  if (!editor) {
    return (
      <div className="min-h-[320px] rounded-xl border border-border bg-background" />
    );
  }

  const setLink = () => {
    const previous = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Link URL', previous ?? 'https://');
    if (url === null) return;
    const trimmed = url.trim();
    if (!trimmed) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({href: trimmed})
      .run();
  };

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-border bg-background',
        disabled && 'opacity-70',
        className,
      )}>
      <div className="flex flex-wrap gap-0.5 border-b border-border bg-muted/40 p-1.5">
        <ToolbarButton
          label="Undo"
          disabled={disabled || !editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 size={15} />
        </ToolbarButton>
        <ToolbarButton
          label="Redo"
          disabled={disabled || !editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 size={15} />
        </ToolbarButton>
        <span className="mx-1 w-px self-stretch bg-border" />
        <ToolbarButton
          label="Heading 2"
          active={editor.isActive('heading', {level: 2})}
          disabled={disabled}
          onClick={() =>
            editor.chain().focus().toggleHeading({level: 2}).run()
          }>
          <Heading2 size={15} />
        </ToolbarButton>
        <ToolbarButton
          label="Heading 3"
          active={editor.isActive('heading', {level: 3})}
          disabled={disabled}
          onClick={() =>
            editor.chain().focus().toggleHeading({level: 3}).run()
          }>
          <Heading3 size={15} />
        </ToolbarButton>
        <span className="mx-1 w-px self-stretch bg-border" />
        <ToolbarButton
          label="Bold"
          active={editor.isActive('bold')}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold size={15} />
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          active={editor.isActive('italic')}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic size={15} />
        </ToolbarButton>
        <ToolbarButton
          label="Underline"
          active={editor.isActive('underline')}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon size={15} />
        </ToolbarButton>
        <ToolbarButton
          label="Strikethrough"
          active={editor.isActive('strike')}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough size={15} />
        </ToolbarButton>
        <span className="mx-1 w-px self-stretch bg-border" />
        <ToolbarButton
          label="Bullet list"
          active={editor.isActive('bulletList')}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List size={15} />
        </ToolbarButton>
        <ToolbarButton
          label="Numbered list"
          active={editor.isActive('orderedList')}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered size={15} />
        </ToolbarButton>
        <ToolbarButton
          label="Link"
          active={editor.isActive('link')}
          disabled={disabled}
          onClick={setLink}>
          <Link2 size={15} />
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
