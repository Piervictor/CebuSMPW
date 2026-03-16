import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { useAppContext } from '../hooks/useAppContext';
import { CircuitForm } from '../components/forms/CircuitForm';
import { CongregationForm } from '../components/forms/CongregationForm';
import { Building2, MapPin, Network, Plus, Users } from 'lucide-react';

export default function CircuitStructure() {
  const { circuits, congregations, locations, members } = useAppContext();
  const [selectedCircuitId, setSelectedCircuitId] = useState<string>(circuits[0]?.id || '');
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [congDialogOpen, setCongDialogOpen] = useState(false);

  // Quick Actions: auto-open dialogs via URL params
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const action = searchParams.get('new');
    if (action === 'circuit') {
      setSearchParams({}, { replace: true });
      setFormDialogOpen(true);
    } else if (action === 'congregation') {
      setSearchParams({}, { replace: true });
      setCongDialogOpen(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedCircuitId && circuits[0]) {
      setSelectedCircuitId(circuits[0].id);
      return;
    }

    if (selectedCircuitId && !circuits.some((circuit) => circuit.id === selectedCircuitId)) {
      setSelectedCircuitId(circuits[0]?.id || '');
    }
  }, [circuits, selectedCircuitId]);

  const selectedCircuit = circuits.find((circuit) => circuit.id === selectedCircuitId) || null;

  const circuitSummaries = useMemo(
    () =>
      circuits.map((circuit) => {
        const circuitCongregations = congregations.filter(
          (congregation) => congregation.circuitId === circuit.id
        );
        const circuitLocations = locations.filter((location) => location.circuitId === circuit.id);
        const congregationIds = new Set(circuitCongregations.map((congregation) => congregation.id));
        const participatingMembers = members.filter((member) => congregationIds.has(member.congregationId));

        return {
          circuit,
          congregationCount: circuitCongregations.length,
          locationCount: circuitLocations.length,
          memberCount: participatingMembers.length,
        };
      }),
    [circuits, congregations, locations, members]
  );

  const selectedCongregations = selectedCircuit
    ? congregations.filter((congregation) => congregation.circuitId === selectedCircuit.id)
    : [];
  const selectedLocations = selectedCircuit
    ? locations.filter((location) => location.circuitId === selectedCircuit.id)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-neutral-900">Circuit Structure</h1>
          <p className="text-neutral-600 mt-1">
            Organize congregations under circuits, then assign witnessing locations to the right circuit.
          </p>
        </div>
        <Button onClick={() => setFormDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Circuit
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Circuits</CardTitle>
            <CardDescription>{circuits.length} circuit{circuits.length !== 1 ? 's' : ''} configured</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {circuitSummaries.map(({ circuit, congregationCount, locationCount, memberCount }) => (
                <button
                  key={circuit.id}
                  onClick={() => setSelectedCircuitId(circuit.id)}
                  className={`w-full rounded-lg border p-4 text-left transition-all ${
                    selectedCircuitId === circuit.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-neutral-900">{circuit.name}</p>
                      {circuit.city && <p className="text-sm text-neutral-600 mt-1">{circuit.city}</p>}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant="secondary">{congregationCount} congregations</Badge>
                        <Badge variant="outline">{locationCount} locations</Badge>
                        <Badge variant="outline">{memberCount} publishers</Badge>
                      </div>
                    </div>
                    {selectedCircuitId === circuit.id && <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          {selectedCircuit ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>{selectedCircuit.name}</CardTitle>
                  <CardDescription>Operational details for the selected circuit</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {selectedCircuit.city && (
                    <div>
                      <p className="text-sm font-medium text-neutral-700">Coverage City</p>
                      <p className="mt-1 text-neutral-900">{selectedCircuit.city}</p>
                    </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-neutral-700">Circuit Overseer</p>
                      <p className="mt-1 text-neutral-900">{selectedCircuit.coordinator}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-sm font-medium text-neutral-700">Notes</p>
                      <p className="mt-1 text-neutral-600">
                        {selectedCircuit.notes || 'No operational notes recorded for this circuit yet.'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-neutral-600">Congregations</p>
                        <p className="text-3xl font-semibold text-neutral-900 mt-2">{selectedCongregations.length}</p>
                      </div>
                      <Network className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-neutral-600">Locations</p>
                        <p className="text-3xl font-semibold text-neutral-900 mt-2">{selectedLocations.length}</p>
                      </div>
                      <MapPin className="h-8 w-8 text-emerald-600" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-neutral-600">Participating Publishers</p>
                        <p className="text-3xl font-semibold text-neutral-900 mt-2">
                          {members.filter((member) => selectedCongregations.some((congregation) => congregation.id === member.congregationId)).length}
                        </p>
                      </div>
                      <Users className="h-8 w-8 text-amber-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Congregations In This Circuit</CardTitle>
                  <CardDescription>
                    Congregations inherit the circuit and can be linked to locations within it.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {selectedCongregations.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-neutral-300 p-6 text-sm text-neutral-500">
                        No congregations are assigned to this circuit yet.
                      </div>
                    ) : (
                      selectedCongregations.map((congregation) => (
                        <div key={congregation.id} className="flex items-center justify-between rounded-lg border border-neutral-200 p-4">
                          <div>
                            <p className="font-medium text-neutral-900">{congregation.name}</p>
                            {congregation.city && <p className="text-sm text-neutral-600 mt-1">{congregation.city}</p>}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {congregation.publisherCount != null && congregation.publisherCount > 0 && (
                              <Badge variant="secondary">{congregation.publisherCount} publishers</Badge>
                            )}
                            <Badge variant="outline">{congregation.coverageRate}% coverage</Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Locations Assigned To This Circuit</CardTitle>
                  <CardDescription>
                    Add new locations from the Locations page and place them under this circuit.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {selectedLocations.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-neutral-300 p-6 text-sm text-neutral-500">
                        No locations have been assigned to this circuit yet.
                      </div>
                    ) : (
                      selectedLocations.map((location) => (
                        <div key={location.id} className="flex items-center justify-between rounded-lg border border-neutral-200 p-4">
                          <div>
                            <p className="font-medium text-neutral-900">{location.name}</p>
                            <p className="text-sm text-neutral-600 mt-1">{location.city}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="secondary">{location.category}</Badge>
                            <Badge variant="outline">{location.linkedCongregations.length} linked congregations</Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-neutral-500">
                <Building2 className="h-12 w-12 mx-auto mb-3 text-neutral-300" />
                <p>No circuit selected.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Circuit</DialogTitle>
            <DialogDescription>
              Create a circuit first, then assign congregations and locations beneath it.
            </DialogDescription>
          </DialogHeader>
          <CircuitForm
            onSuccess={() => setFormDialogOpen(false)}
            onCancel={() => setFormDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={congDialogOpen} onOpenChange={setCongDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Congregation</DialogTitle>
            <DialogDescription>
              {selectedCircuitId
                ? 'Create a new congregation under the selected circuit.'
                : 'No circuit selected. Please create a circuit first.'}
            </DialogDescription>
          </DialogHeader>
          {selectedCircuitId ? (
            <CongregationForm
              circuitId={selectedCircuitId}
              onSuccess={() => setCongDialogOpen(false)}
              onCancel={() => setCongDialogOpen(false)}
            />
          ) : (
            <p className="text-sm text-center py-4" style={{ color: '#6B7280' }}>
              Add a circuit first before creating a congregation.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
