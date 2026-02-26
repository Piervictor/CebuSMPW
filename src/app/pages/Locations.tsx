import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { locations, congregations, getCongregationName, type Location } from '../data/mockData';
import { MapPin, Search, Plus, Info } from 'lucide-react';

export default function Locations() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const filteredLocations = locations.filter((location) =>
    location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    location.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    location.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openLocationDetails = (location: Location) => {
    setSelectedLocation(location);
    setSheetOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-neutral-900">Locations</h1>
          <p className="text-neutral-600 mt-1">Manage public witnessing sites across the circuit</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Location
        </Button>
      </div>

      {/* Search and Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="md:col-span-4">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <Input
                type="text"
                placeholder="Search locations by name, city, or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Total Locations</p>
                <p className="text-2xl font-semibold text-neutral-900 mt-1">{locations.length}</p>
              </div>
              <MapPin className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Active Sites</p>
                <p className="text-2xl font-semibold text-neutral-900 mt-1">
                  {locations.filter((l) => l.active).length}
                </p>
              </div>
              <div className="h-3 w-3 bg-green-500 rounded-full" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Hospitals</p>
                <p className="text-2xl font-semibold text-neutral-900 mt-1">
                  {locations.filter((l) => l.category === 'Hospital').length}
                </p>
              </div>
              <Badge variant="outline">Hospital</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Malls & Plazas</p>
                <p className="text-2xl font-semibold text-neutral-900 mt-1">
                  {locations.filter((l) => l.category === 'Mall' || l.category === 'Plaza').length}
                </p>
              </div>
              <Badge variant="outline">Retail</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Locations Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Locations</CardTitle>
          <CardDescription>
            {filteredLocations.length} location{filteredLocations.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Linked Congregations</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLocations.map((location) => (
                <TableRow key={location.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-neutral-400" />
                      <span className="font-medium">{location.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        location.category === 'Hospital'
                          ? 'border-blue-300 text-blue-700'
                          : location.category === 'Plaza'
                          ? 'border-green-300 text-green-700'
                          : location.category === 'Terminal'
                          ? 'border-purple-300 text-purple-700'
                          : 'border-amber-300 text-amber-700'
                      }
                    >
                      {location.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-neutral-600">{location.city}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {location.linkedCongregations.slice(0, 2).map((congId) => (
                        <Badge key={congId} variant="secondary" className="text-xs">
                          {getCongregationName(congId).split(' ')[0]}
                        </Badge>
                      ))}
                      {location.linkedCongregations.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{location.linkedCongregations.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={location.active ? 'default' : 'secondary'}>
                      {location.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openLocationDetails(location)}
                    >
                      <Info className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Location Details Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selectedLocation && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedLocation.name}</SheetTitle>
                <SheetDescription>Location details and requirements</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div>
                  <label className="text-sm font-medium text-neutral-700">Category</label>
                  <p className="mt-1">
                    <Badge
                      variant="outline"
                      className={
                        selectedLocation.category === 'Hospital'
                          ? 'border-blue-300 text-blue-700'
                          : selectedLocation.category === 'Plaza'
                          ? 'border-green-300 text-green-700'
                          : selectedLocation.category === 'Terminal'
                          ? 'border-purple-300 text-purple-700'
                          : 'border-amber-300 text-amber-700'
                      }
                    >
                      {selectedLocation.category}
                    </Badge>
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-neutral-700">City</label>
                  <p className="mt-1 text-neutral-900">{selectedLocation.city}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-neutral-700">Status</label>
                  <p className="mt-1">
                    <Badge variant={selectedLocation.active ? 'default' : 'secondary'}>
                      {selectedLocation.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-neutral-700">Linked Congregations</label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedLocation.linkedCongregations.map((congId) => (
                      <Badge key={congId} variant="secondary">
                        {getCongregationName(congId)}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="border-t border-neutral-200 pt-6">
                  <h3 className="font-medium text-neutral-900 mb-4">Requirements</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-neutral-700">Allowed Age Groups</label>
                      <p className="mt-1">
                        <Badge variant="outline">{selectedLocation.ageGroup}</Badge>
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-neutral-700">Experience Level</label>
                      <p className="mt-1">
                        <Badge variant="outline">{selectedLocation.experienceLevel}</Badge>
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-neutral-700">
                        Max Publishers per Shift
                      </label>
                      <p className="mt-1 text-neutral-900">{selectedLocation.maxPublishers}</p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-neutral-200 pt-6">
                  <label className="text-sm font-medium text-neutral-700">Notes</label>
                  <p className="mt-2 text-sm text-neutral-600 leading-relaxed">
                    {selectedLocation.notes}
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button className="flex-1">Edit Location</Button>
                  <Button variant="outline" onClick={() => setSheetOpen(false)}>
                    Close
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
