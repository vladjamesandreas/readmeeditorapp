import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import TiptapLink from '@tiptap/extension-link';
import { FC, useEffect, useState } from 'react';
import TurndownService from 'turndown';
import { Remarkable } from 'remarkable';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Image from '@tiptap/extension-image';
import {
  Bold,
  Strikethrough,
  Italic,
  List,
  ListOrdered,
  Heading2,
  Underline as UnderlineIcon,
  Link as LinkIcon,
  Undo,
  Redo,
  Quote,
  Code,
  Table as TableIcon,
  Image as ImageIcon,
} from 'lucide-react';
import ImageUploader from './ImageUploader';

const md = new Remarkable();
const turndownService = new TurndownService();

interface Props {
  content: string;
  onChange: (content: string) => void;
}

const RichTextEditor: FC<Props> = ({ content, onChange }) => {
  const [editMode, setEditMode] = useState<'rich' | 'raw'>('rich');
  const [unsavedImagePaths, setUnsavedImagePaths] = useState<string[]>([]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      TiptapLink.configure({
        autolink: false,
        linkOnPaste: false,
        openOnClick: false,
      }),
      Placeholder.configure({
        placeholder: 'Start typing...',
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableCell,
      TableHeader,
      Image.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            'data-image-path': {
              default: null,
            },
          };
        },
      }),
    ],
    editorProps: {
      attributes: {
        class:
          'prose prose-invert prose-lg focus:outline-none max-w-full mx-auto h-full p-4 border rounded-md',
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const images = doc.querySelectorAll('img');

      images.forEach((img) => {
        const path = img.getAttribute('data-image-path');
        if (path) {
          const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/images/${path}`;
          img.setAttribute('src', publicUrl);
        }
      });

      onChange(turndownService.turndown(doc.body.innerHTML));
    },
  });

  useEffect(() => {
    if (editor && content !== turndownService.turndown(editor.getHTML())) {
      editor.commands.setContent(md.render(content));
    }
  }, [content, editor]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (unsavedImagePaths.length > 0) {
        const payload = JSON.stringify({ filePaths: unsavedImagePaths });
        navigator.sendBeacon('/api/storage/cleanup', payload);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [unsavedImagePaths]);

  const toggleEditMode = () => {
    setEditMode(editMode === 'rich' ? 'raw' : 'rich');
  };

  return (
    <div className="p-4">
      <div className="flex justify-end mb-4">
        <button
          onClick={toggleEditMode}
          className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded"
        >
          {editMode === 'rich' ? 'Raw Editor' : 'Rich Editor'}
        </button>
      </div>
      {editMode === 'rich' ? (
        <>
          <Toolbar
            editor={editor}
            setUnsavedImagePaths={setUnsavedImagePaths}
          />
          <EditorContent editor={editor} />
        </>
      ) : (
        <textarea
          value={content}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-96 p-4 border rounded-md bg-gray-900 text-white"
          title="Raw Markdown Editor"
          placeholder="Enter Markdown..."
        />
      )}
    </div>
  );
};

const Toolbar: FC<{
  editor: Editor | null;
  setUnsavedImagePaths: React.Dispatch<React.SetStateAction<string[]>>;
}> = ({ editor, setUnsavedImagePaths }) => {
  if (!editor) {
    return null;
  }

  return (
    <div className="flex items-center justify-between p-2 border rounded-md mb-4 flex-wrap">
      <div className="flex items-center space-x-2 flex-wrap">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'is-active' : ''}
          title="Bold"
        >
          <Bold className="w-5 h-5" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'is-active' : ''}
          title="Italic"
        >
          <Italic className="w-5 h-5" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={editor.isActive('underline') ? 'is-active' : ''}
          title="Underline"
        >
          <UnderlineIcon className="w-5 h-5" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={editor.isActive('strike') ? 'is-active' : ''}
          title="Strikethrough"
        >
          <Strikethrough className="w-5 h-5" />
        </button>
        <button
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          className={
            editor.isActive('heading', { level: 2 }) ? 'is-active' : ''
          }
          title="Heading 2"
        >
          <Heading2 className="w-5 h-5" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive('bulletList') ? 'is-active' : ''}
          title="Bullet List"
        >
          <List className="w-5 h-5" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive('orderedList') ? 'is-active' : ''}
          title="Ordered List"
        >
          <ListOrdered className="w-5 h-5" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={editor.isActive('blockquote') ? 'is-active' : ''}
          title="Blockquote"
        >
          <Quote className="w-5 h-5" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={editor.isActive('codeBlock') ? 'is-active' : ''}
          title="Code Block"
        >
          <Code className="w-5 h-5" />
        </button>
        <button
          onClick={() =>
            editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
          }
          title="Insert Table"
        >
          <TableIcon className="w-5 h-5" />
        </button>
        <ImageUploader
          onUpload={async (path) => {
            if (path) {
              try {
                const response = await fetch('/api/storage/signed-url', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ filePath: path }),
                });

                if (!response.ok) {
                  throw new Error('Failed to get signed URL');
                }

                const { signedUrl } = await response.json();
                editor
                  .chain()
                  .focus()
                  .setImage({
                    src: signedUrl,
                    'data-image-path': path,
                  } as any)
                  .run();
                setUnsavedImagePaths((prev) => [...prev, path]);
              } catch (error) {
                console.error(error);
                // Handle error, maybe show a toast notification
              }
            }
          }}
        />
        <Link editor={editor} />
      </div>
      <div className="flex items-center space-x-2">
        <button
          onClick={() => editor.chain().focus().undo().run()}
          title="Undo"
        >
          <Undo className="w-5 h-5" />
        </button>
        <button
          onClick={() => editor.chain().focus().redo().run()}
          title="Redo"
        >
          <Redo className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

const Link: FC<{ editor: Editor | null }> = ({ editor }) => {
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [url, setUrl] = useState('');

  if (!editor) {
    return null;
  }

  const addLink = () => {
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
      setIsLinkModalOpen(false);
      setUrl('');
    }
  };

  return (
    <>
      <button onClick={() => setIsLinkModalOpen(true)} title="Add Link">
        <LinkIcon className="w-5 h-5" />
      </button>
      {isLinkModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-4 rounded-md border border-gray-700">
            <h3 className="text-lg font-bold mb-2 text-white">Add Link</h3>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full p-2 rounded-md bg-gray-900 text-white border border-gray-700"
            />
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setIsLinkModalOpen(false)}
                className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded mr-2"
              >
                Cancel
              </button>
              <button
                onClick={addLink}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RichTextEditor;
