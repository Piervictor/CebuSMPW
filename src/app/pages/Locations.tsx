import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { LocationForm } from '../components/forms/LocationForm';
import { useAppContext } from '../hooks/useAppContext';
import type { Location } from '../data/mockData';
import { MapPin, Search, Plus, Info, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Locations() {
  const { locations, deleteLocation, error, isLoading } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState<Location | null>(null);

  const filteredLocations = locations.filter((location) =>
    location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    location.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    location.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openLocationDetails = (location: Location) => {
    setSelectedLocation(location);
    setSheetOpen(true);
  };

  const handleAddLocation = () => {
    setEditingLocation(null);
    setFormDialogOpen(true);
  };

  const handleEditLocation = (location: Location) => {
    setEditingLocation(location);
    setFormDialogOpen(true);
    setSheetOpen(false);
  };

  const handleDeleteClick = (location: Location) => {
    setLocationToDelete(location);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (locationToDelete) {
      try {
        await deleteLocation(locationToDelete.id);
        toast.success('Location deleted successfully');
        setDeleteConfirmOpen(false);
        setLocationToDelete(null);
        setSheetOpen(false);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to delete location';
        toast.error(errorMsg);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-neutral-900">Locations</h1>
          <p className="text-neutral-600 mt-1">Manage public witnessing sites across the circuit</p>
        </div>
        <Button onClick={handleAddLocation}>
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
          {filteredLocations.length === 0 ? (
            <div className="text-center py-8">
              <MapPin className="h-12 w-12 text-neutral-300 mx-auto mb-3" />
              <p className="text-neutral-600">No locations found. Try adjusting your search.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>City</TableHead>
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
                      <Badge variant={location.active ? 'default' : 'secondary'}>
                        {location.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openLocationDetails(location)}
                        title="View details"
                      >
                        <Info className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditLocation(location)}
                        title="Edit location"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDeleteClick(location)}
                        title="Delete location"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
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
                  <label className="text-sm font-medium text-neutral-700">Max Publishers</label>
                  <p className="mt-1 text-neutral-900">{selectedLocation.maxPublishers}</p>
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
                  </div>
                </div>

                <div className="border-t border-neutral-200 pt-6">
                  <label className="text-sm font-medium text-neutral-700">Notes</label>
                  <p className="mt-2 text-sm text-neutral-600 leading-relaxed">
                    {selectedLocation.notes || '(No notes)'}
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button className="flex-1" onClick={() => handleEditLocation(selectedLocation)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Location
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={() => handleDeleteClick(selectedLocation)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Add/Edit Location Dialog */}
      <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
        <DialogContent className="w-full sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingLocation ? 'Edit Location' : 'Add New Location'}</DialogTitle>
            <DialogDescription>
              {editingLocation
                ? 'Update the location details below'
                : 'Fill in the details to create a new location'}
            </DialogDescription>
          </DialogHeader>
          <LocationForm
            location={editingLocation || undefined}
            onSuccess={() => setFormDialogOpen(false)}
            onCancel={() => setFormDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Location?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{locationToDelete?.name}</strong>? 
              This action cannot be undone. All associated shift data will also be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={isLoading}
            >
              {isLoading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
