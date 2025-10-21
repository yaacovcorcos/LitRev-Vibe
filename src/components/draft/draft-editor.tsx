"use client";

import { useEffect, useMemo } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import type { Editor } from "@tiptap/react";

type DraftEditorProps = {
  content: Record<string, unknown> | null;
  editable?: boolean;
  placeholder?: string;
  onUpdate?: (next: Record<string, unknown>) => void;
};

const DEFAULT_DOC = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Compose content will appear here once the literature review job completes.",
        },
      ],
    },
  ],
};

export function DraftEditor({
  content,
  editable = false,
  placeholder = "Start drafting…",
  onUpdate,
}: DraftEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    editable,
    content: content ?? DEFAULT_DOC,
    onUpdate: ({ editor }) => {
      if (!onUpdate) {
        return;
      }
      onUpdate(editor.getJSON() as Record<string, unknown>);
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }
    editor.setEditable(editable);
  }, [editor, editable]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const nextContent = content ?? DEFAULT_DOC;
    const currentJSON = editor.getJSON();
    if (JSON.stringify(currentJSON) === JSON.stringify(nextContent)) {
      return;
    }

    editor.commands.setContent(nextContent, { emitUpdate: false });
  }, [editor, content]);

  if (!editor) {
    return null;
  }

  return (
    <div className="space-y-3">
      {editable ? <EditorToolbar editor={editor} /> : null}
      <div className="prose max-w-none">
        <EditorContent editor={editor} aria-label="Draft section editor" role={editable ? "textbox" : undefined} />
      </div>
    </div>
  );
}

type ToolbarItem = {
  label: string;
  action: () => boolean;
  isActive: () => boolean;
  disabled?: () => boolean;
};

type ToolbarGroup = {
  label: string;
  items: ToolbarItem[];
};

type EditorToolbarProps = {
  editor: Editor;
};

function EditorToolbar({ editor }: EditorToolbarProps) {
  const groups: ToolbarGroup[] = useMemo(
    () => [
      {
        label: "Formatting",
        items: [
          { label: "Bold", action: () => editor.chain().focus().toggleBold().run(), isActive: () => editor.isActive("bold") },
          { label: "Italic", action: () => editor.chain().focus().toggleItalic().run(), isActive: () => editor.isActive("italic") },
          { label: "Bullet list", action: () => editor.chain().focus().toggleBulletList().run(), isActive: () => editor.isActive("bulletList") },
        ],
      },
      {
        label: "Structure",
        items: [
          { label: "Heading", action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), isActive: () => editor.isActive("heading", { level: 2 }) },
          { label: "Undo", action: () => editor.commands.undo(), isActive: () => false },
          { label: "Redo", action: () => editor.commands.redo(), isActive: () => false },
        ],
      },
    ],
    [editor],
  );

  return (
    <div className="flex flex-wrap gap-2" role="toolbar" aria-label="Draft editor formatting controls">
      {groups.map((group) => (
        <div key={group.label} className="flex items-center gap-1" aria-label={group.label}>
          {group.items.map((item) => {
            const active = item.isActive();
            const disabled = item.disabled?.() ?? false;
            return (
              <button
                key={item.label}
                type="button"
                onClick={item.action}
                disabled={disabled}
                className={`rounded border px-2 py-1 text-xs transition ${
                  active ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"
                } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
                aria-pressed={active}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
