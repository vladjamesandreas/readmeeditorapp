import { useState } from "react";
import { File, Folder, ChevronRight, ChevronDown } from "lucide-react";

export interface Tree {
    path: string;
    type: "tree" | "blob";
    children?: Tree[];
}

interface FileTreeProps {
    tree: Tree[];
    onSelectFile: (path: string) => void;
}

const TreeItem = ({ item, onSelectFile }: { item: Tree; onSelectFile: (path: string) => void }) => {
    const [isOpen, setIsOpen] = useState(false);

    if (item.type === "tree") {
        return (
            <div className="ml-4">
                <div className="flex items-center cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
                    {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    <Folder size={16} className="mr-2" />
                    <span>{item.path.split("/").pop()}</span>
                </div>
                {isOpen && (
                    <div>
                        {item.children?.map((child) => (
                            <TreeItem key={child.path} item={child} onSelectFile={onSelectFile} />
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="ml-4 flex items-center cursor-pointer" onClick={() => onSelectFile(item.path)}>
            <File size={16} className="mr-2" />
            <span>{item.path.split("/").pop()}</span>
        </div>
    );
};

export const FileTree = ({ tree, onSelectFile }: FileTreeProps) => {
    return (
        <div>
            {tree.map((item) => (
                <TreeItem key={item.path} item={item} onSelectFile={onSelectFile} />
            ))}
        </div>
    );
};
