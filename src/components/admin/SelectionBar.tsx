import { Button } from "@/components/ui/button";
import { X, Download, CheckCircle, Flag, Trash2 } from "lucide-react";

interface SelectionBarProps {
  selectedCount: number;
  totalVisible: number;
  totalFiltered?: number; // Total after filters, across all pages
  selectionMode?: 'none' | 'specific' | 'all-filtered';
  onSelectAll: () => void;
  onSelectAllFiltered?: () => void;
  onClearSelection: () => void;
  onExportSelected?: () => void;
  onBulkResolveAnomalies?: () => void;
  onAddBlackMark?: () => void;
  onDeleteSelected?: () => void;
}

export const SelectionBar = ({ 
  selectedCount, 
  totalVisible, 
  totalFiltered,
  selectionMode = 'specific',
  onSelectAll, 
  onSelectAllFiltered,
  onClearSelection,
  onExportSelected,
  onBulkResolveAnomalies,
  onAddBlackMark,
  onDeleteSelected
}: SelectionBarProps) => {
  if (selectedCount === 0) return null;

  const displayText = selectionMode === 'all-filtered' && totalFiltered
    ? `All ${totalFiltered.toLocaleString()} filtered rows selected`
    : `${selectedCount} row${selectedCount !== 1 ? 's' : ''} selected${selectedCount < totalVisible ? ` (of ${totalVisible} visible)` : ''}`;

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-bottom-2">
      <div className="bg-primary text-primary-foreground shadow-lg rounded-lg px-6 py-3 flex items-center gap-4">
        <span className="font-medium">
          {displayText}
        </span>
        <div className="flex gap-2 flex-wrap">
          {onExportSelected && (
            <Button
              size="sm"
              variant="secondary"
              onClick={onExportSelected}
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          )}
          {onBulkResolveAnomalies && (
            <Button
              size="sm"
              variant="secondary"
              onClick={onBulkResolveAnomalies}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Resolve All
            </Button>
          )}
          {onAddBlackMark && (
            <Button
              size="sm"
              variant="secondary"
              onClick={onAddBlackMark}
            >
              <Flag className="h-4 w-4 mr-1" />
              Black Mark
            </Button>
          )}
          {onDeleteSelected && (
            <Button
              size="sm"
              variant="destructive"
              onClick={onDeleteSelected}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          )}
          {selectionMode === 'specific' && selectedCount < totalVisible && (
            <Button
              size="sm"
              variant="secondary"
              onClick={onSelectAll}
            >
              Select All on Page
            </Button>
          )}
          {selectionMode === 'specific' && onSelectAllFiltered && totalFiltered && selectedCount < totalFiltered && (
            <Button
              size="sm"
              variant="secondary"
              onClick={onSelectAllFiltered}
            >
              Select All Filtered ({totalFiltered.toLocaleString()})
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={onClearSelection}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
