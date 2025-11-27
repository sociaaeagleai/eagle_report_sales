import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Check, Flag, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { AI_BATCHES, DM_BATCHES, getSourceDisplayLabel, getSourceDbValue, getSubSourceDisplayLabel, getSubSourceDbValue, getSubSourceOptions, requiresSubSource } from "@/lib/sourceBatches";

type FieldType = 'numeric' | 'source' | 'subsource' | 'dropdown' | 'textarea' | 'readonly';

interface EditableCellProps {
  value: any;
  fieldName: string;
  fieldType: FieldType;
  userMode?: 'AI' | 'DM';
  sources?: string[];
  isEditMode: boolean;
  onSave: (value: any) => Promise<void>;
  validationRules?: {
    min?: number;
    max?: number;
    maxRelativeField?: string;
    maxRelativeValue?: number;
  };
}

export const EditableCell = ({
  value,
  fieldName,
  fieldType,
  userMode,
  sources = [],
  isEditMode,
  onSave,
  validationRules,
}: EditableCellProps) => {
  const [localValue, setLocalValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleSave = async (newValue: any) => {
    // Convert to number for numeric fields BEFORE validation and saving
    const saveValue = fieldType === 'numeric' ? Number(newValue) : newValue;
    
    // Validation
    if (fieldType === 'numeric' && validationRules) {
      const numValue = Number(newValue);
      if (validationRules.min !== undefined && numValue < validationRules.min) {
        setError(`Must be at least ${validationRules.min}`);
        return;
      }
      if (validationRules.max !== undefined && numValue > validationRules.max) {
        setError(`Must be at most ${validationRules.max}`);
        return;
      }
      if (validationRules.maxRelativeValue !== undefined && numValue > validationRules.maxRelativeValue) {
        setError(`Cannot exceed ${validationRules.maxRelativeField} (${validationRules.maxRelativeValue})`);
        return;
      }
    }

    setError(null);
    setIsSaving(true);
    try {
      await onSave(saveValue);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 1500);
    } catch (err) {
      setError('Failed to save');
      console.error('Save error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBlur = () => {
    if (localValue !== value) {
      handleSave(localValue);
    }
  };

  const handleNumericChange = (newValue: string) => {
    setLocalValue(newValue);
    // Debounce save for numeric inputs
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (newValue !== value) {
        handleSave(newValue);
      }
    }, 800);
  };

  if (!isEditMode) {
    // Display mode - render value normally
    if (fieldType === 'source' && Array.isArray(value)) {
      return (
        <div className="flex flex-wrap gap-1">
          {value.map((src, idx) => (
            <Badge key={idx} variant="outline" className="text-xs">
              {src}
            </Badge>
          ))}
        </div>
      );
    }
    
    if (fieldType === 'subsource') {
      return value ? (
        <Badge variant="secondary" className="text-xs capitalize">
          {value}
        </Badge>
      ) : (
        <span className="text-muted-foreground">-</span>
      );
    }

    return <span>{value ?? '-'}</span>;
  }

  // Edit mode - render appropriate control
  return (
    <div className="flex items-center gap-2 relative">
      {fieldType === 'numeric' && (
        <Input
          type="number"
          value={localValue}
          onChange={(e) => handleNumericChange(e.target.value)}
          onBlur={handleBlur}
          className="h-8 w-20"
          min={validationRules?.min ?? 0}
        />
      )}

      {fieldType === 'source' && userMode && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 justify-between min-w-[120px]">
              {localValue.length > 0 ? `${localValue.length} selected` : 'Select sources'}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[250px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search sources..." />
              <CommandEmpty>No sources found</CommandEmpty>
              <CommandGroup className="max-h-[200px] overflow-y-auto">
                {(userMode === 'AI' ? AI_BATCHES : DM_BATCHES).flatMap(batch => {
                  // Determine if this batch is selectable
                  const selectedBatch = (userMode === 'AI' ? AI_BATCHES : DM_BATCHES).find(b => 
                    b.sources.some(s => localValue.includes(getSourceDbValue(s)))
                  );
                  const isBatchDisabled = selectedBatch && selectedBatch.batchId !== batch.batchId && localValue.length > 0;
                  
                  return batch.sources.map(source => {
                    const dbValue = getSourceDbValue(source);
                    const isSelected = localValue.includes(dbValue);
                    return (
                      <CommandItem
                        key={dbValue}
                        onSelect={() => {
                          if (isBatchDisabled && !isSelected) return;
                          const newValue = isSelected
                            ? localValue.filter((s: string) => s !== dbValue)
                            : [...localValue, dbValue];
                          setLocalValue(newValue);
                          handleSave(newValue);
                        }}
                        disabled={isBatchDisabled && !isSelected}
                        className={cn(isBatchDisabled && !isSelected && "opacity-50 cursor-not-allowed")}
                      >
                        <Checkbox checked={isSelected} className="mr-2" disabled={isBatchDisabled && !isSelected} />
                        <span className="text-sm">{source}</span>
                        {isBatchDisabled && !isSelected && (
                          <span className="ml-auto text-xs text-muted-foreground">(Different batch)</span>
                        )}
                      </CommandItem>
                    );
                  });
                })}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
      )}

      {fieldType === 'subsource' && userMode && (
        <Select
          value={localValue || 'none'}
          onValueChange={(newValue) => {
            const actualValue = newValue === 'none' ? null : newValue;
            setLocalValue(actualValue);
            handleSave(actualValue);
          }}
        >
          <SelectTrigger className="h-8 w-[120px]">
            <SelectValue placeholder="Select sub-source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {getSubSourceOptions(sources, userMode).map(subSrc => {
              const dbValue = getSubSourceDbValue(subSrc);
              return (
                <SelectItem key={dbValue} value={dbValue}>
                  {subSrc}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      )}

      {fieldType === 'dropdown' && (
        <Select
          value={localValue || ''}
          onValueChange={(newValue) => {
            setLocalValue(newValue);
            handleSave(newValue);
          }}
        >
          <SelectTrigger className="h-8 w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {fieldName === 'is_crm_updated' && (
              <>
                <SelectItem value="Yes">Yes</SelectItem>
                <SelectItem value="No">No</SelectItem>
                <SelectItem value="Not Required">Not Required</SelectItem>
              </>
            )}
            {fieldName === 'task_completion_status' && (
              <>
                <SelectItem value="Yes (100%)">Yes (100%)</SelectItem>
                <SelectItem value="Not yet">Not yet</SelectItem>
                <SelectItem value="Partially">Partially</SelectItem>
              </>
            )}
            {fieldName === 'attendance.status' && (
              <>
                <SelectItem value="present">Present</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
              </>
            )}
            {fieldName === 'attendance.absence_type' && (
              <>
                <SelectItem value="sick_leave">Sick Leave</SelectItem>
                <SelectItem value="casual_leave">Casual Leave</SelectItem>
                <SelectItem value="emergency">Emergency</SelectItem>
                <SelectItem value="unapproved">Unapproved</SelectItem>
              </>
            )}
            {fieldName === 'attendance.performance_rating' && (
              <>
                <SelectItem value="1">1</SelectItem>
                <SelectItem value="2">2</SelectItem>
                <SelectItem value="3">3</SelectItem>
                <SelectItem value="4">4</SelectItem>
                <SelectItem value="5">5</SelectItem>
              </>
            )}
          </SelectContent>
        </Select>
      )}

      {fieldType === 'textarea' && (
        <Textarea
          value={localValue || ''}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          className="min-h-[60px] resize-none"
          maxLength={1000}
        />
      )}

      {/* Status indicators */}
      {isSaving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
      {showSuccess && <Check className="h-3 w-3 text-green-500" />}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
};
