"use client";

import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";

type DraftEditorProps = {
  content: Record<string, unknown> | null;
  editable?: boolean;
  placeholder?: string;
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

export function DraftEditor({ content, editable = false, placeholder = "Start drafting…" }: DraftEditorProps) {
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
    editor.commands.setContent(nextContent, false, {
      preserveWhitespace: "full",
    });
  }, [editor, content]);

  if (!editor) {
    return null;
  }

  return (
    <div className="prose max-w-none">
      <EditorContent editor={editor} />
    </div>
  );
}
