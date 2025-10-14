import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "./ui/dialog";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Search, Plus, Edit, Trash2, Users } from "lucide-react";

// Defino un tipo más estricto para las propiedades de edición (para corregir el error de setNewUser)
type UserRole = "admin" | "operador" | "analista" | "cliente";
type UserStatus = "active" | "inactive";

type UIUser = {
  id: string;
  name: string;
  email: string;
  rol: UserRole | string; // Se mantiene flexible para datos de API
  status: UserStatus | string; // Se mantiene flexible para datos de API
  lastLogin?: string;
};

// **CORRECCIÓN 1: Definición de tipo para NewUser/EditingUser**
// Usamos los tipos más amplios (UserRole, UserStatus) en lugar de literales 'as const' para que
// handleEditUser pueda asignar un usuario existente sin error de tipado.
type NewUserForm = {
    name: string;
    email: string;
    rol: UserRole | string;
    status: UserStatus | string;
}

export function UserManagement() {
  const [users, setUsers] = useState<UIUser[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UIUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newUser, setNewUser] = useState<NewUserForm>({ // Usamos el nuevo tipo
    name: "",
    email: "",
    rol: "operador",
    status: "active"
  });

  // Cargar usuarios desde backend (requiere admin)
    useEffect(() => {
    (async () => {
        try {
        const resp = await fetch('/api/users', { credentials: 'include' });
        if (!resp.ok) throw new Error('No se pudo cargar usuarios');

        const json = await resp.json();
        const items = Array.isArray(json.data) ? json.data : [];

        const mapped: UIUser[] = items.map((u: any) => ({
            id: String(u.usuario_id ?? u.id ?? ''),
            name: u.nombre ?? u.name ?? '',
            email: u.correo ?? u.email ?? '',
            rol: u.rol ?? u.role ?? 'operador',
            status:
            u.is_active === false ||
            u.isActive === false ||
            u.status === 'inactive'
                ? 'inactive'
                : 'active',
            lastLogin: u.last_login ?? u.lastLogin ?? undefined,
        }));

        setUsers(mapped);
        } catch (e: any) {
        console.error('Error cargando usuarios:', e);
        setError(e?.message || 'Error al cargar');
        } finally {
        setLoading(false);
        }
    })();
    }, []);

    const handleCreateUser = async () => {
    try {
        const resp = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
            nombre: newUser.name,
            correo: newUser.email,
            rol: newUser.rol,
            password: 'Usuario123!',
        }),
        });

        if (!resp.ok) throw new Error('No se pudo crear el usuario');

        const created = await resp.json();
        const u = created.data;

        const mapped: UIUser = {
        id: String(u.usuario_id ?? u.id ?? ''),
        name: u.nombre ?? u.name ?? '',
        email: u.correo ?? u.email ?? '',
        rol: u.rol ?? u.role ?? 'operador',
        status:
            u.is_active === false ||
            u.isActive === false ||
            u.status === 'inactive'
            ? 'inactive'
            : 'active',
        lastLogin: u.last_login ?? u.lastLogin ?? undefined,
        };

        setUsers([...users, mapped]);
        setNewUser({ name: '', email: '', rol: 'operador', status: 'active' });
        setIsCreateModalOpen(false);
    } catch (e) {
        console.error('Error creando usuario:', e);
        alert('Error creando usuario');
    }
    };
    // Filtro por nombre o correo
    const filteredUsers = users.filter((user) =>
    (user.name ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.email ?? "").toLowerCase().includes(searchTerm.toLowerCase())
    );

  // **CORRECCIÓN 4 y 5: handleEditUser para asignar tipos flexibles**
  // Se ha corregido el error de tipado de rol y status quitando el 'as any' 
  // de la línea 32 y usando el tipo NewUserForm.
  const handleEditUser = (user: UIUser) => {
    setEditingUser(user);
    setNewUser({
      name: user.name,
      email: user.email,
      rol: user.rol,
      status: user.status
    });
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    try {
      const resp = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ nombre: newUser.name, correo: newUser.email, rol: newUser.rol, is_active: newUser.status === 'active' }),
      });
      if (!resp.ok) throw new Error('No se pudo actualizar');
      // La propagación de ...newUser funciona ahora que rol y status son del tipo correcto (no 'as const')
      setUsers(users.map(user => user.id === editingUser.id ? { ...user, ...newUser as UIUser } : user));
      setEditingUser(null);
      setNewUser({ name: "", email: "", rol: "operador", status: "active" });
    } catch (e) {
      alert('Error actualizando usuario');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const resp = await fetch(`/api/users/${userId}`, { method: 'DELETE', credentials: 'include' });
      if (!resp.ok) throw new Error('No se pudo eliminar');
      setUsers(users.filter(user => user.id !== userId));
    } catch (e) {
      alert('Error eliminando usuario');
    }
  };

  const getrolBadgeVariant = (rol: string) => {
    switch (rol) {
      case 'admin': return 'default';
      case 'operador': return 'secondary';
      case 'analista': return 'outline';
      case 'cliente': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    return status === 'active' ? 'default' : 'destructive';
  };

  const rolLabels: Record<string, string> = {
    admin: 'Administrador',
    operador: 'Operador',
    analista: 'Analista',
    cliente: 'cliente'
  };

  const statusLabels: Record<string, string> = {
    active: 'Activo',
    inactive: 'Inactivo'
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestión de Usuarios</h1>
            <p className="text-gray-600 mt-2">
              Administra usuarios del sistema Urban Flow
            </p>
          </div>
          
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button className="mt-4 lg:mt-0">
                <Plus className="h-4 w-4 mr-2" />
                Crear Usuario
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Nuevo Usuario</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Nombre Completo</Label>
                  <Input
                    id="name"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    placeholder="Ej. Juan Pérez"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Correo Electrónico</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="juan.perez@urbanflow.com"
                  />
                </div>
                <div>
                  <Label htmlFor="rol">Rol</Label>
                  <Select value={newUser.rol} onValueChange={(value: UserRole | string) => setNewUser({ ...newUser, rol: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="operador">Operador</SelectItem>
                      <SelectItem value="analista">Analista</SelectItem>
                      <SelectItem value="cliente">cliente</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="status">Estado</Label>
                  <Select value={newUser.status} onValueChange={(value: UserStatus | string) => setNewUser({ ...newUser, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Activo</SelectItem>
                      <SelectItem value="inactive">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateUser}>
                  Crear Usuario
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Administradores</CardTitle>
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.filter(u => u.rol === 'admin').length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Operadores</CardTitle>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.filter(u => u.rol === 'operador').length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Analistas</CardTitle>
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.filter(u => u.rol === 'analista').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <CardTitle>Lista de Usuarios</CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar usuarios..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading && <div className="text-sm text-gray-500">Cargando usuarios...</div>}
            {error && <div className="text-sm text-red-600">{error}</div>}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Último Acceso</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getrolBadgeVariant(user.rol)}>
                        {rolLabels[user.rol as keyof typeof rolLabels] || user.rol}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(user.status)}>
                        {/* CORRECCIÓN 6: Añadir un fallback para evitar renderizar 'undefined' */}
                        {statusLabels[user.status as keyof typeof statusLabels] || user.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.lastLogin || 'Nunca'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Dialog open={editingUser?.id === user.id} onOpenChange={(open: boolean) => !open && setEditingUser(null)}>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleEditUser(user)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Editar Usuario</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="edit-name">Nombre Completo</Label>
                                <Input
                                  id="edit-name"
                                  value={newUser.name}
                                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                                />
                              </div>
                              <div>
                                <Label htmlFor="edit-email">Correo Electrónico</Label>
                                <Input
                                  id="edit-email"
                                  type="email"
                                  value={newUser.email}
                                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                />
                              </div>
                              <div>
                                <Label htmlFor="edit-rol">Rol</Label>
                                <Select value={newUser.rol} onValueChange={(value: UserRole | string) => setNewUser({ ...newUser, rol: value })}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="operador">Operador</SelectItem>
                                    <SelectItem value="analista">Analista</SelectItem>
                                    <SelectItem value="cliente">cliente</SelectItem>
                                    <SelectItem value="admin">Administrador</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label htmlFor="edit-status">Estado</Label>
                                <Select value={newUser.status} onValueChange={(value: UserStatus | string) => setNewUser({ ...newUser, status: value })}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="active">Activo</SelectItem>
                                    <SelectItem value="inactive">Inactivo</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setEditingUser(null)}>
                                Cancelar
                              </Button>
                              <Button onClick={handleUpdateUser}>
                                Guardar Cambios
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}