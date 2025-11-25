import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardFilters {
  selectedUsers: string[];
  selectedTeams: string[];
  startDate: string;
  endDate: string;
}

interface Profile {
  id: string;
  name: string;
  mode: string | null;
}

interface DashboardFiltersProps {
  filters: DashboardFilters;
  onFilterChange: (filters: DashboardFilters) => void;
  profiles: Profile[];
}

const DashboardFiltersComponent = ({ filters, onFilterChange, profiles }: DashboardFiltersProps) => {
  const updateFilter = (key: keyof DashboardFilters, value: any) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const toggleStaff = (userId: string) => {
    const current = filters.selectedUsers;
    const updated = current.includes(userId)
      ? current.filter((id) => id !== userId)
      : [...current, userId];
    updateFilter("selectedUsers", updated);
  };

  const toggleTeam = (team: string) => {
    const current = filters.selectedTeams;
    const updated = current.includes(team)
      ? current.filter((t) => t !== team)
      : [...current, team];
    updateFilter("selectedTeams", updated);
  };

  const clearFilters = () => {
    onFilterChange({
      selectedUsers: [],
      selectedTeams: [],
      startDate: "",
      endDate: "",
    });
  };

  const activeFilterCount =
    filters.selectedUsers.length +
    filters.selectedTeams.length +
    (filters.startDate ? 1 : 0) +
    (filters.endDate ? 1 : 0);

  const teamOptions = [
    { value: "AI", label: "AI Team" },
    { value: "DM", label: "DM Team" },
  ];

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">Filters</h3>
            {activeFilterCount > 0 && (
              <Badge variant="secondary">{activeFilterCount} active</Badge>
            )}
          </div>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear All
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Start Date */}
          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={filters.startDate}
              onChange={(e) => updateFilter("startDate", e.target.value)}
            />
          </div>

          {/* End Date */}
          <div className="space-y-2">
            <Label htmlFor="endDate">End Date</Label>
            <Input
              id="endDate"
              type="date"
              value={filters.endDate}
              onChange={(e) => updateFilter("endDate", e.target.value)}
            />
          </div>

          {/* Staff Multi-Select */}
          <div className="space-y-2">
            <Label>Staff</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between"
                >
                  {filters.selectedUsers.length === 0
                    ? "All Staff"
                    : `${filters.selectedUsers.length} selected`}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search staff..." />
                  <CommandList>
                    <CommandEmpty>No staff found.</CommandEmpty>
                    <CommandGroup>
                      {profiles.map((profile) => (
                        <CommandItem
                          key={profile.id}
                          onSelect={() => toggleStaff(profile.id)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              filters.selectedUsers.includes(profile.id)
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          {profile.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {filters.selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {filters.selectedUsers.map((userId) => {
                  const profile = profiles.find((p) => p.id === userId);
                  return (
                    <Badge key={userId} variant="secondary" className="gap-1">
                      {profile?.name}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => toggleStaff(userId)}
                      />
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>

          {/* Team Multi-Select */}
          <div className="space-y-2">
            <Label>Team</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between"
                >
                  {filters.selectedTeams.length === 0
                    ? "All Teams"
                    : `${filters.selectedTeams.length} selected`}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0" align="start">
                <Command>
                  <CommandList>
                    <CommandGroup>
                      {teamOptions.map((team) => (
                        <CommandItem
                          key={team.value}
                          onSelect={() => toggleTeam(team.value)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              filters.selectedTeams.includes(team.value)
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          {team.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {filters.selectedTeams.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {filters.selectedTeams.map((team) => {
                  const option = teamOptions.find((t) => t.value === team);
                  return (
                    <Badge key={team} variant="secondary" className="gap-1">
                      {option?.label}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => toggleTeam(team)}
                      />
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DashboardFiltersComponent;
