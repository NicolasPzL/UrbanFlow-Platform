import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "./ui/dialog";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Checkbox } from "./ui/checkbox";
// Dejar de usar datos mock. Consumir backend.
type UIUser = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "operator" | "analyst" | string;
  status: "active" | "inactive" | string;
  lastLogin?: string;
};
import { Search, Plus, Edit, Trash2, Users } from "lucide-react";

export function UserManagement() {
  const [users, setUsers] = useState<UIUser[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UIUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  type RoleUnion = "admin" | "operator" | "analyst";
  type StatusUnion = "active" | "inactive";
  type NewUser = { name: string; email: string; role: RoleUnion; status: StatusUnion };

  const normalizeRole = (r: string): RoleUnion => (r === 'admin' || r === 'operator' || r === 'analyst') ? r : 'operator';
  const normalizeStatus = (s: string): StatusUnion => (s === 'inactive' ? 'inactive' : 'active');

  const [newUser, setNewUser] = useState<NewUser>({
    name: "",
    email: "",
    role: "operator",
    status: "active"
  });
  // selección múltiple de roles (crear)
  const [newUserRoles, setNewUserRoles] = useState<RoleUnion[]>(["operator"]);
  // selección múltiple de roles (editar)
  const [editUserRoles, setEditUserRoles] = useState<RoleUnion[]>([]);

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
          role: normalizeRole(String(u.rol ?? u.role ?? 'operator')),
          status: (u.is_active === false ? 'inactive' : 'active'),
          lastLogin: u.last_login ?? u.lastLogin ?? undefined,
        }));
        setUsers(mapped);
      } catch (e: any) {
        setError(e?.message || 'Error al cargar');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredUsers = users.filter((user: UIUser) =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateUser = async () => {
    try {
      const resp = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          nombre: newUser.name,
          correo: newUser.email,
          rol: (newUserRoles[0] ?? newUser.role),
          roles: newUserRoles,
          password: 'Usuario123!'
        }),
      });
      if (!resp.ok) throw new Error('No se pudo crear el usuario');
      const created = await resp.json();
      const u = created.data;
      const mapped: UIUser = {
        id: String(u.usuario_id ?? u.id ?? ''),
        name: u.nombre ?? '',
        email: u.correo ?? '',
        role: normalizeRole(String(u.rol ?? 'operator')),
        status: (u.is_active === false ? 'inactive' : 'active'),
        lastLogin: u.last_login ?? undefined,
      };
      setUsers([...users, mapped]);
      setNewUser({ name: "", email: "", role: "operator", status: "active" });
      setNewUserRoles(["operator"]);
      setIsCreateModalOpen(false);
    } catch (e) {
      alert('Error creando usuario');
    }
  };

  const handleEditUser = async (user: UIUser) => {
    setEditingUser(user);
    setNewUser({
      name: user.name,
      email: user.email,
      role: normalizeRole(String(user.role)),
      status: normalizeStatus(String(user.status))
    });
    // obtener roles actuales del usuario para preseleccionar
    try {
      const r = await fetch(`/api/users/${user.id}`, { credentials: 'include' });
      if (r.ok) {
        const j = await r.json();
        const rolesArr: string[] = Array.isArray(j?.data?.roles) ? j.data.roles : [];
        const normalized = rolesArr.map(x => normalizeRole(String(x)));
        const uniq = Array.from(new Set(normalized)) as RoleUnion[];
        setEditUserRoles(uniq.length ? uniq : [normalizeRole(String(user.role))]);
      } else {
        setEditUserRoles([normalizeRole(String(user.role))]);
      }
    } catch {
      setEditUserRoles([normalizeRole(String(user.role))]);
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    try {
      const resp = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          nombre: newUser.name,
          correo: newUser.email,
          rol: (editUserRoles[0] ?? newUser.role),
          roles: editUserRoles,
          is_active: newUser.status === 'active'
        }),
      });
      if (!resp.ok) throw new Error('No se pudo actualizar');
      // actualizar vista con rol primario
      setUsers(users.map(user => user.id === editingUser.id ? { ...user, ...newUser, role: (editUserRoles[0] ?? newUser.role) } : user));
      setEditingUser(null);
      setNewUser({ name: "", email: "", role: "operator", status: "active" });
      setEditUserRoles([]);
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

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'default';
      case 'operator': return 'secondary';
      case 'analyst': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    return status === 'active' ? 'default' : 'destructive';
  };

  const roleLabels: Record<string, string> = {
    admin: 'Administrador',
    operator: 'Operador',
    analyst: 'Analista'
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
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewUser({ ...newUser, name: e.target.value })}
                    placeholder="Ej. Juan Pérez"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Correo Electrónico</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUser.email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="juan.perez@urbanflow.com"
                  />
                </div>
                <div>
                  <Label>Roles</Label>
                  <div className="mt-2 grid grid-cols-3 gap-3">
                    {(["operator","analyst","admin"] as RoleUnion[]).map(r => (
                      <label key={r} className="flex items-center space-x-2">
                        <Checkbox
                          checked={newUserRoles.includes(r)}
                          onCheckedChange={(checked: boolean | 'indeterminate') => {
                            const c = Boolean(checked);
                            setNewUserRoles(prev => c ? Array.from(new Set([...prev, r])) : prev.filter(x => x !== r));
                            if (c && newUser.role !== r) setNewUser({ ...newUser, role: r });
                          }}
                        />
                        <span>{r === 'admin' ? 'Administrador' : r === 'analyst' ? 'Analista' : 'Operador'}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <Label htmlFor="status">Estado</Label>
                  <Select value={newUser.status} onValueChange={(value: string) => setNewUser({ ...newUser, status: normalizeStatus(value) })}>
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
                {users.filter(u => u.role === 'admin').length}
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
                {users.filter(u => u.role === 'operator').length}
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
                {users.filter(u => u.role === 'analyst').length}
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
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
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
                {filteredUsers.map((user: UIUser) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {roleLabels[user.role] || String(user.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(user.status)}>
                        {statusLabels[user.status] || String(user.status)}
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
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewUser({ ...newUser, name: e.target.value })}
                                />
                              </div>
                              <div>
                                <Label htmlFor="edit-email">Correo Electrónico</Label>
                                <Input
                                  id="edit-email"
                                  type="email"
                                  value={newUser.email}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewUser({ ...newUser, email: e.target.value })}
                                />
                              </div>
                              <div>
                                <Label htmlFor="edit-role">Roles</Label>
                                <div className="mt-2 grid grid-cols-3 gap-3">
                                  {(["operator","analyst","admin"] as RoleUnion[]).map(r => (
                                    <label key={r} className="flex items-center space-x-2">
                                      <Checkbox
                                        checked={editUserRoles.includes(r)}
                                        onCheckedChange={(checked: boolean | 'indeterminate') => {
                                          const c = Boolean(checked);
                                          setEditUserRoles(prev => c ? Array.from(new Set([...prev, r])) : prev.filter(x => x !== r));
                                          if (c && newUser.role !== r) setNewUser({ ...newUser, role: r });
                                        }}
                                      />
                                      <span>{r === 'admin' ? 'Administrador' : r === 'analyst' ? 'Analista' : 'Operador'}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <Label htmlFor="edit-status">Estado</Label>
                                <Select value={newUser.status} onValueChange={(value: string) => setNewUser({ ...newUser, status: normalizeStatus(value) })}>
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