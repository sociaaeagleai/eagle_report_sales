import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Check, ChevronsUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { cn } from "@/lib/utils";

interface FilterState {
  selectedUsers: string[];
  selectedTeams: string[];
  selectedSources: string[];
  startDate: string;
  endDate: string;
  rapportBuiltMin: string;
  rapportBuiltMax: string;
  callsDialledMin: string;
  callsDialledMax: string;
  callsTakenMin: string;
  callsTakenMax: string;
  touchedBaseMin: string;
  touchedBaseMax: string;
  callsNotTakenMin: string;
  callsNotTakenMax: string;
  othersMin: string;
  othersMax: string;
  disqualifiedMin: string;
  disqualifiedMax: string;
  followedUpMin: string;
  followedUpMax: string;
  anomalyResolutionStatus: string;
  closingTypes: string[];
  smRpMin: string;
  smRpMax: string;
  smEnrolledMin: string;
  smEnrolledMax: string;
  smRpToEnrolledMin: string;
  smRpToEnrolledMax: string;
  fuRpMin: string;
  fuRpMax: string;
  fuEnrolledMin: string;
  fuEnrolledMax: string;
  fuRpToEnrolledMin: string;
  fuRpToEnrolledMax: string;
  dataQuality: string;
  selectedAnomalies: string[];
  taskCompletionStatus: string[];
}

interface AdvancedFiltersProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  profiles: Array<{ id: string; name: string; mode: string | null }>;
  sources: string[];
}

export const AdvancedFilters = ({ filters, onFilterChange, profiles, sources }: AdvancedFiltersProps) => {
  const updateFilter = (key: keyof FilterState, value: any) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const toggleClosingType = (type: string) => {
    const newTypes = filters.closingTypes.includes(type)
      ? filters.closingTypes.filter(t => t !== type)
      : [...filters.closingTypes, type];
    updateFilter('closingTypes', newTypes);
  };

  const toggleStaff = (userId: string) => {
    const newUsers = filters.selectedUsers.includes(userId)
      ? filters.selectedUsers.filter(u => u !== userId)
      : [...filters.selectedUsers, userId];
    updateFilter('selectedUsers', newUsers);
  };

  const toggleTeam = (team: string) => {
    const newTeams = filters.selectedTeams.includes(team)
      ? filters.selectedTeams.filter(t => t !== team)
      : [...filters.selectedTeams, team];
    updateFilter('selectedTeams', newTeams);
  };

  const toggleSource = (source: string) => {
    const newSources = filters.selectedSources.includes(source)
      ? filters.selectedSources.filter(s => s !== source)
      : [...filters.selectedSources, source];
    updateFilter('selectedSources', newSources);
  };

  const clearFilters = () => {
    onFilterChange({
      selectedUsers: [],
      selectedTeams: [],
      selectedSources: [],
      startDate: "",
      endDate: "",
      rapportBuiltMin: "",
      rapportBuiltMax: "",
      callsDialledMin: "",
      callsDialledMax: "",
      callsTakenMin: "",
      callsTakenMax: "",
      touchedBaseMin: "",
      touchedBaseMax: "",
      callsNotTakenMin: "",
      callsNotTakenMax: "",
      othersMin: "",
      othersMax: "",
      disqualifiedMin: "",
      disqualifiedMax: "",
      followedUpMin: "",
      followedUpMax: "",
      anomalyResolutionStatus: "all",
      closingTypes: [],
      smRpMin: "",
      smRpMax: "",
      smEnrolledMin: "",
      smEnrolledMax: "",
      smRpToEnrolledMin: "",
      smRpToEnrolledMax: "",
      fuRpMin: "",
      fuRpMax: "",
      fuEnrolledMin: "",
      fuEnrolledMax: "",
      fuRpToEnrolledMin: "",
      fuRpToEnrolledMax: "",
      dataQuality: "all",
      selectedAnomalies: [],
      taskCompletionStatus: [],
    });
  };

  const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'closingTypes' || key === 'selectedUsers' || key === 'selectedTeams' || key === 'selectedSources') return (value as string[]).length > 0;
    if (key === 'dataQuality') return value !== 'all'; // Exclude dataQuality from filter count
    return value !== '';
  }).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Filters</h3>
          {activeFilterCount > 0 && (
            <Badge variant="secondary">{activeFilterCount} active</Badge>
          )}
        </div>
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      {/* General Filters */}
      <div className="space-y-4">
        <h4 className="font-medium text-sm text-muted-foreground">General Filters</h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Staff {filters.selectedUsers.length > 0 && `(${filters.selectedUsers.length})`}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  {filters.selectedUsers.length === 0 ? "Select staff..." : `${filters.selectedUsers.length} selected`}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search staff..." />
                  <CommandEmpty>No staff found.</CommandEmpty>
                  <CommandGroup className="max-h-64 overflow-auto">
                    {profiles.map((profile) => (
                      <CommandItem
                        key={profile.id}
                        onSelect={() => toggleStaff(profile.id)}
                      >
                        <div className={cn(
                          "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                          filters.selectedUsers.includes(profile.id)
                            ? "bg-primary text-primary-foreground"
                            : "opacity-50 [&_svg]:invisible"
                        )}>
                          <Check className="h-4 w-4" />
                        </div>
                        <span>{profile.name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
            {filters.selectedUsers.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => updateFilter('selectedUsers', [])}
                className="h-7 text-xs"
              >
                Clear
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <Label>Team {filters.selectedTeams.length > 0 && `(${filters.selectedTeams.length})`}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  {filters.selectedTeams.length === 0 ? "Select team..." : `${filters.selectedTeams.length} selected`}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0" align="start">
                <Command>
                  <CommandGroup>
                    {['AI', 'DM'].map((team) => (
                      <CommandItem
                        key={team}
                        onSelect={() => toggleTeam(team)}
                      >
                        <div className={cn(
                          "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                          filters.selectedTeams.includes(team)
                            ? "bg-primary text-primary-foreground"
                            : "opacity-50 [&_svg]:invisible"
                        )}>
                          <Check className="h-4 w-4" />
                        </div>
                        <span>{team} Team</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
            {filters.selectedTeams.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => updateFilter('selectedTeams', [])}
                className="h-7 text-xs"
              >
                Clear
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <Label>Source {filters.selectedSources.length > 0 && `(${filters.selectedSources.length})`}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  {filters.selectedSources.length === 0 ? "Select sources..." : `${filters.selectedSources.length} selected`}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search sources..." />
                  <CommandEmpty>No sources found.</CommandEmpty>
                  <CommandGroup className="max-h-64 overflow-auto">
                    {sources.map((source) => (
                      <CommandItem
                        key={source}
                        onSelect={() => toggleSource(source)}
                      >
                        <div className={cn(
                          "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                          filters.selectedSources.includes(source)
                            ? "bg-primary text-primary-foreground"
                            : "opacity-50 [&_svg]:invisible"
                        )}>
                          <Check className="h-4 w-4" />
                        </div>
                        <span>{source}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
            {filters.selectedSources.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => updateFilter('selectedSources', [])}
                className="h-7 text-xs"
              >
                Clear
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <Label>Start Date</Label>
            <Input 
              type="date" 
              value={filters.startDate}
              onChange={(e) => updateFilter('startDate', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>End Date</Label>
            <Input 
              type="date" 
              value={filters.endDate}
              onChange={(e) => updateFilter('endDate', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Call Activity Filters */}
      <div className="space-y-4">
        <h4 className="font-medium text-sm text-muted-foreground">Call Activity</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>No. of Rapport Built</Label>
            <div className="flex gap-2">
              <Input 
                type="number" 
                placeholder="Min"
                value={filters.rapportBuiltMin}
                onChange={(e) => updateFilter('rapportBuiltMin', e.target.value)}
              />
              <Input 
                type="number" 
                placeholder="Max"
                value={filters.rapportBuiltMax}
                onChange={(e) => updateFilter('rapportBuiltMax', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>No. of Calls Dialled</Label>
            <div className="flex gap-2">
              <Input 
                type="number" 
                placeholder="Min"
                value={filters.callsDialledMin}
                onChange={(e) => updateFilter('callsDialledMin', e.target.value)}
              />
              <Input 
                type="number" 
                placeholder="Max"
                value={filters.callsDialledMax}
                onChange={(e) => updateFilter('callsDialledMax', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>No. of Calls Taken</Label>
            <div className="flex gap-2">
              <Input 
                type="number" 
                placeholder="Min"
                value={filters.callsTakenMin}
                onChange={(e) => updateFilter('callsTakenMin', e.target.value)}
              />
              <Input 
                type="number" 
                placeholder="Max"
                value={filters.callsTakenMax}
                onChange={(e) => updateFilter('callsTakenMax', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>No. of Touched Base</Label>
            <div className="flex gap-2">
              <Input 
                type="number" 
                placeholder="Min"
                value={filters.touchedBaseMin}
                onChange={(e) => updateFilter('touchedBaseMin', e.target.value)}
              />
              <Input 
                type="number" 
                placeholder="Max"
                value={filters.touchedBaseMax}
                onChange={(e) => updateFilter('touchedBaseMax', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Calls Not Taken</Label>
            <div className="flex gap-2">
              <Input 
                type="number" 
                placeholder="Min"
                value={filters.callsNotTakenMin}
                onChange={(e) => updateFilter('callsNotTakenMin', e.target.value)}
              />
              <Input 
                type="number" 
                placeholder="Max"
                value={filters.callsNotTakenMax}
                onChange={(e) => updateFilter('callsNotTakenMax', e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Other Activity Filters */}
      <div className="space-y-4">
        <h4 className="font-medium text-sm text-muted-foreground">Other Activity</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Others (DNP, DNS, etc.)</Label>
            <div className="flex gap-2">
              <Input 
                type="number" 
                placeholder="Min"
                value={filters.othersMin}
                onChange={(e) => updateFilter('othersMin', e.target.value)}
              />
              <Input 
                type="number" 
                placeholder="Max"
                value={filters.othersMax}
                onChange={(e) => updateFilter('othersMax', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Disqualified / Not Interested</Label>
            <div className="flex gap-2">
              <Input 
                type="number" 
                placeholder="Min"
                value={filters.disqualifiedMin}
                onChange={(e) => updateFilter('disqualifiedMin', e.target.value)}
              />
              <Input 
                type="number" 
                placeholder="Max"
                value={filters.disqualifiedMax}
                onChange={(e) => updateFilter('disqualifiedMax', e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Follow-up Activity Filter */}
      <div className="space-y-4">
        <h4 className="font-medium text-sm text-muted-foreground">Follow-up Activity</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>No. of Follow-ups</Label>
            <div className="flex gap-2">
              <Input 
                type="number" 
                placeholder="Min"
                value={filters.followedUpMin}
                onChange={(e) => updateFilter('followedUpMin', e.target.value)}
              />
              <Input 
                type="number" 
                placeholder="Max"
                value={filters.followedUpMax}
                onChange={(e) => updateFilter('followedUpMax', e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Closing Type Filter */}
      <div className="space-y-4">
        <h4 className="font-medium text-sm text-muted-foreground">Type of Closing</h4>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={filters.closingTypes.includes('same_month') ? 'default' : 'outline'}
            size="sm"
            onClick={() => toggleClosingType('same_month')}
          >
            Same Month Closing
          </Button>
          <Button
            variant={filters.closingTypes.includes('follow_up') ? 'default' : 'outline'}
            size="sm"
            onClick={() => toggleClosingType('follow_up')}
          >
            Follow-up Closing
          </Button>
        </div>
      </div>

      {/* Same Month Closing Filters */}
      <div className="space-y-4">
        <h4 className="font-medium text-sm text-muted-foreground">Same Month Closing</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>No. of RP</Label>
            <div className="flex gap-2">
              <Input 
                type="number" 
                placeholder="Min"
                value={filters.smRpMin}
                onChange={(e) => updateFilter('smRpMin', e.target.value)}
              />
              <Input 
                type="number" 
                placeholder="Max"
                value={filters.smRpMax}
                onChange={(e) => updateFilter('smRpMax', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>No. of Fully Enrolled</Label>
            <div className="flex gap-2">
              <Input 
                type="number" 
                placeholder="Min"
                value={filters.smEnrolledMin}
                onChange={(e) => updateFilter('smEnrolledMin', e.target.value)}
              />
              <Input 
                type="number" 
                placeholder="Max"
                value={filters.smEnrolledMax}
                onChange={(e) => updateFilter('smEnrolledMax', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>No. of RP to Enrolled</Label>
            <div className="flex gap-2">
              <Input 
                type="number" 
                placeholder="Min"
                value={filters.smRpToEnrolledMin}
                onChange={(e) => updateFilter('smRpToEnrolledMin', e.target.value)}
              />
              <Input 
                type="number" 
                placeholder="Max"
                value={filters.smRpToEnrolledMax}
                onChange={(e) => updateFilter('smRpToEnrolledMax', e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Follow-up Closing Filters */}
      <div className="space-y-4">
        <h4 className="font-medium text-sm text-muted-foreground">Follow-up Closing</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>No. of RP</Label>
            <div className="flex gap-2">
              <Input 
                type="number" 
                placeholder="Min"
                value={filters.fuRpMin}
                onChange={(e) => updateFilter('fuRpMin', e.target.value)}
              />
              <Input 
                type="number" 
                placeholder="Max"
                value={filters.fuRpMax}
                onChange={(e) => updateFilter('fuRpMax', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>No. of Fully Enrolled</Label>
            <div className="flex gap-2">
              <Input 
                type="number" 
                placeholder="Min"
                value={filters.fuEnrolledMin}
                onChange={(e) => updateFilter('fuEnrolledMin', e.target.value)}
              />
              <Input 
                type="number" 
                placeholder="Max"
                value={filters.fuEnrolledMax}
                onChange={(e) => updateFilter('fuEnrolledMax', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>No. of RP to Enrolled</Label>
            <div className="flex gap-2">
              <Input 
                type="number" 
                placeholder="Min"
                value={filters.fuRpToEnrolledMin}
                onChange={(e) => updateFilter('fuRpToEnrolledMin', e.target.value)}
              />
              <Input 
                type="number" 
                placeholder="Max"
                value={filters.fuRpToEnrolledMax}
                onChange={(e) => updateFilter('fuRpToEnrolledMax', e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Task Completion Status Filter */}
      <div className="space-y-4">
        <h4 className="font-medium text-sm text-muted-foreground">Task Completion</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Task Status {filters.taskCompletionStatus.length > 0 && `(${filters.taskCompletionStatus.length})`}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  {filters.taskCompletionStatus.length === 0 ? "Select status..." : `${filters.taskCompletionStatus.length} selected`}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[250px] p-0" align="start">
                <Command>
                  <CommandGroup>
                    {['Yes (100%)', 'Not yet', 'Have time'].map((status) => (
                      <CommandItem
                        key={status}
                        onSelect={() => {
                          const newStatuses = filters.taskCompletionStatus.includes(status)
                            ? filters.taskCompletionStatus.filter(s => s !== status)
                            : [...filters.taskCompletionStatus, status];
                          updateFilter('taskCompletionStatus', newStatuses);
                        }}
                      >
                        <div className={cn(
                          "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                          filters.taskCompletionStatus.includes(status)
                            ? "bg-primary text-primary-foreground"
                            : "opacity-50 [&_svg]:invisible"
                        )}>
                          <Check className="h-4 w-4" />
                        </div>
                        <span>{status}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
            {filters.taskCompletionStatus.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => updateFilter('taskCompletionStatus', [])}
                className="h-7 text-xs"
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
