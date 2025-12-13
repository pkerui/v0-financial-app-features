'use client'

import { useState } from 'react'
import { Store } from '@/lib/backend/stores'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { ArrowLeft, Plus, Edit, Trash2, Store as StoreIcon, MapPin, User, Phone, Calendar, Wallet, Users, LogOut, Key } from 'lucide-react'
import Link from 'next/link'
import { createStore, updateStore, deleteStore } from '@/lib/backend/stores'
import { logout } from '@/lib/auth/actions'
import { useRouter } from 'next/navigation'
import { UserManagement } from '@/components/user-management'
import { ApiConfig } from '@/components/api-config'
import type { UserRole } from '@/lib/auth/permissions'

interface StoreSettingsContentProps {
  stores: Store[]
  currentUserId: string
  currentUserRole: UserRole
}

const statusLabels: Record<string, string> = {
  active: '营业中',
  inactive: '停业',
  preparing: '筹备中',
  closed: '已关闭',
}

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800 border-green-200',
  inactive: 'bg-gray-100 text-gray-800 border-gray-200',
  preparing: 'bg-blue-100 text-blue-800 border-blue-200',
  closed: 'bg-red-100 text-red-800 border-red-200',
}

export function StoreSettingsContent({ stores: initialStores, currentUserId, currentUserRole }: StoreSettingsContentProps) {
  const router = useRouter()
  const [stores, setStores] = useState<Store[]>(initialStores)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingStore, setEditingStore] = useState<Store | null>(null)
  const [storeToDelete, setStoreToDelete] = useState<Store | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 新增店铺表单
  const [newStore, setNewStore] = useState({
    name: '',
    code: '',
    city: '',
    address: '',
    manager_name: '',
    manager_phone: '',
    status: 'active' as const,
    initial_balance_date: '',
    initial_balance: '',
  })

  const handleAddStore = async () => {
    if (!newStore.name) {
      toast.error('请输入店铺名称')
      return
    }

    setIsSubmitting(true)
    try {
      const storeData = {
        ...newStore,
        initial_balance_date: newStore.initial_balance_date || undefined,
        initial_balance: newStore.initial_balance ? parseFloat(newStore.initial_balance) : undefined,
      }
      const { data, error } = await createStore(storeData)
      if (error) {
        toast.error(`添加失败: ${error}`)
      } else if (data) {
        setStores([...stores, data])
        setIsAddDialogOpen(false)
        setNewStore({
          name: '',
          code: '',
          city: '',
          address: '',
          manager_name: '',
          manager_phone: '',
          status: 'active',
          initial_balance_date: '',
          initial_balance: '',
        })
        toast.success('店铺添加成功')
        router.refresh()
      }
    } catch (err) {
      toast.error('添加失败，请重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditStore = async () => {
    if (!editingStore) return

    setIsSubmitting(true)
    try {
      // 注意：期初日期和期初余额只能通过分店财务设置页面修改
      const { data, error } = await updateStore(editingStore.id, {
        name: editingStore.name,
        code: editingStore.code,
        city: editingStore.city,
        address: editingStore.address,
        manager_name: editingStore.manager_name,
        manager_phone: editingStore.manager_phone,
        status: editingStore.status,
      })

      if (error) {
        toast.error(`更新失败: ${error}`)
      } else if (data) {
        setStores(stores.map(s => s.id === data.id ? data : s))
        setIsEditDialogOpen(false)
        setEditingStore(null)
        toast.success('店铺信息更新成功')
        router.refresh()
      }
    } catch (err) {
      toast.error('更新失败，请重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteClick = (store: Store) => {
    setStoreToDelete(store)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!storeToDelete) return

    setIsSubmitting(true)
    try {
      const { error } = await deleteStore(storeToDelete.id)
      if (error) {
        toast.error(`删除失败: ${error}`)
      } else {
        setStores(stores.filter(s => s.id !== storeToDelete.id))
        toast.success('店铺删除成功')
        setIsDeleteDialogOpen(false)
        setStoreToDelete(null)
        router.refresh()
      }
    } catch (err) {
      toast.error('删除失败，请重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 检查用户是否可以管理店铺（owner 和 accountant 可以）
  const canManageStores = currentUserRole === 'owner' || currentUserRole === 'accountant'
  // 检查用户是否可以查看团队管理（owner 和 accountant 可以）
  const canViewTeam = currentUserRole === 'owner' || currentUserRole === 'accountant'
  // 检查用户是否可以管理 API 配置（只有 owner 可以）
  const canManageApi = currentUserRole === 'owner'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/stores">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              返回店铺管理
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">管理设置</h1>
            <p className="text-muted-foreground">管理店铺和团队成员</p>
          </div>
        </div>
        <form action={logout}>
          <Button variant="outline" className="gap-2">
            <LogOut className="h-4 w-4" />
            退出登录
          </Button>
        </form>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="stores" className="w-full">
        <TabsList className={`grid w-full max-w-lg ${canManageApi ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <TabsTrigger value="stores" className="gap-2">
            <StoreIcon className="h-4 w-4" />
            店铺管理
          </TabsTrigger>
          {canViewTeam && (
            <TabsTrigger value="team" className="gap-2">
              <Users className="h-4 w-4" />
              团队管理
            </TabsTrigger>
          )}
          {canManageApi && (
            <TabsTrigger value="api" className="gap-2">
              <Key className="h-4 w-4" />
              API 配置
            </TabsTrigger>
          )}
        </TabsList>

        {/* 店铺管理 Tab */}
        <TabsContent value="stores" className="space-y-6 mt-6">
          {/* 店铺管理头部操作 */}
          {canManageStores && (
            <div className="flex justify-end">
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              新增店铺
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>新增店铺</DialogTitle>
              <DialogDescription>
                填写店铺基本信息
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">店铺名称 *</Label>
                <Input
                  id="name"
                  value={newStore.name}
                  onChange={(e) => setNewStore({ ...newStore, name: e.target.value })}
                  placeholder="例如：上海旗舰店"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="code">店铺编号</Label>
                <Input
                  id="code"
                  value={newStore.code}
                  onChange={(e) => setNewStore({ ...newStore, code: e.target.value })}
                  placeholder="例如：SH001"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="city">城市</Label>
                <Input
                  id="city"
                  value={newStore.city}
                  onChange={(e) => setNewStore({ ...newStore, city: e.target.value })}
                  placeholder="例如：上海"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="address">详细地址</Label>
                <Input
                  id="address"
                  value={newStore.address}
                  onChange={(e) => setNewStore({ ...newStore, address: e.target.value })}
                  placeholder="例如：浦东新区世纪大道100号"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="manager_name">店长姓名</Label>
                <Input
                  id="manager_name"
                  value={newStore.manager_name}
                  onChange={(e) => setNewStore({ ...newStore, manager_name: e.target.value })}
                  placeholder="例如：张三"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="manager_phone">店长电话</Label>
                <Input
                  id="manager_phone"
                  value={newStore.manager_phone}
                  onChange={(e) => setNewStore({ ...newStore, manager_phone: e.target.value })}
                  placeholder="例如：13800138000"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status">店铺状态</Label>
                <Select
                  value={newStore.status}
                  onValueChange={(value) => setNewStore({ ...newStore, status: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">营业中</SelectItem>
                    <SelectItem value="preparing">筹备中</SelectItem>
                    <SelectItem value="inactive">停业</SelectItem>
                    <SelectItem value="closed">已关闭</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="initial_balance_date">期初日期 *</Label>
                <Input
                  id="initial_balance_date"
                  type="date"
                  value={newStore.initial_balance_date}
                  onChange={(e) => setNewStore({ ...newStore, initial_balance_date: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">该店铺财务数据的起始日期</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="initial_balance">期初余额</Label>
                <Input
                  id="initial_balance"
                  type="number"
                  step="0.01"
                  value={newStore.initial_balance}
                  onChange={(e) => setNewStore({ ...newStore, initial_balance: e.target.value })}
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground">开始使用系统时的现金余额</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleAddStore} disabled={isSubmitting}>
                {isSubmitting ? '添加中...' : '添加'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
            </div>
          )}

          {/* 店铺列表 */}
      <Card>
        <CardHeader>
          <CardTitle>店铺列表</CardTitle>
          <CardDescription>共 {stores.length} 家店铺</CardDescription>
        </CardHeader>
        <CardContent>
          <Table className="table-fixed w-full">
            <TableHeader>
              <TableRow>
                <TableHead>店铺名称</TableHead>
                <TableHead>编号</TableHead>
                <TableHead>城市</TableHead>
                <TableHead>期初日期</TableHead>
                <TableHead>期初余额</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stores.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    暂无店铺，点击右上角"新增店铺"按钮添加
                  </TableCell>
                </TableRow>
              ) : (
                stores.map((store) => (
                  <TableRow key={store.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <StoreIcon className="h-4 w-4 text-muted-foreground" />
                        {store.name}
                      </div>
                    </TableCell>
                    <TableCell>{store.code || '-'}</TableCell>
                    <TableCell>
                      {store.city ? (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          {store.city}
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {store.initial_balance_date ? (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          {store.initial_balance_date}
                        </div>
                      ) : (
                        <span className="text-orange-500">未设置</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {store.initial_balance !== undefined && store.initial_balance !== null ? (
                        <div className="flex items-center gap-1">
                          <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
                          ¥{store.initial_balance.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[store.status]} variant="outline">
                        {statusLabels[store.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {canManageStores ? (
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingStore(store)
                              setIsEditDialogOpen(true)
                            }}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteClick(store)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 编辑对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑店铺</DialogTitle>
            <DialogDescription>
              修改店铺信息
            </DialogDescription>
          </DialogHeader>
          {editingStore && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">店铺名称 *</Label>
                <Input
                  id="edit-name"
                  value={editingStore.name || ''}
                  onChange={(e) => setEditingStore({ ...editingStore, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-code">店铺编号</Label>
                <Input
                  id="edit-code"
                  value={editingStore.code || ''}
                  onChange={(e) => setEditingStore({ ...editingStore, code: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-city">城市</Label>
                <Input
                  id="edit-city"
                  value={editingStore.city || ''}
                  onChange={(e) => setEditingStore({ ...editingStore, city: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-address">详细地址</Label>
                <Input
                  id="edit-address"
                  value={editingStore.address || ''}
                  onChange={(e) => setEditingStore({ ...editingStore, address: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-manager_name">店长姓名</Label>
                <Input
                  id="edit-manager_name"
                  value={editingStore.manager_name || ''}
                  onChange={(e) => setEditingStore({ ...editingStore, manager_name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-manager_phone">店长电话</Label>
                <Input
                  id="edit-manager_phone"
                  value={editingStore.manager_phone || ''}
                  onChange={(e) => setEditingStore({ ...editingStore, manager_phone: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-status">店铺状态</Label>
                <Select
                  value={editingStore.status}
                  onValueChange={(value) => setEditingStore({ ...editingStore, status: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">营业中</SelectItem>
                    <SelectItem value="preparing">筹备中</SelectItem>
                    <SelectItem value="inactive">停业</SelectItem>
                    <SelectItem value="closed">已关闭</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* 期初设置 - 只读显示，引导到财务设置页面修改 */}
              <div className="grid gap-2 p-3 bg-muted/50 rounded-lg border">
                <div className="flex items-center justify-between">
                  <Label className="text-muted-foreground">期初设置</Label>
                  <Link href={`/settings?store=${editingStore.id}`}>
                    <Button variant="link" size="sm" className="h-auto p-0 text-xs">
                      前往财务设置修改 →
                    </Button>
                  </Link>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">期初日期：</span>
                    <span className="font-medium">
                      {editingStore.initial_balance_date || <span className="text-orange-500">未设置</span>}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">期初余额：</span>
                    <span className="font-medium">
                      {editingStore.initial_balance !== undefined && editingStore.initial_balance !== null
                        ? `¥${editingStore.initial_balance.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`
                        : <span className="text-orange-500">未设置</span>}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleEditStore} disabled={isSubmitting}>
              {isSubmitting ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除店铺「{storeToDelete?.name}」吗？此操作不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={isSubmitting}>
              {isSubmitting ? '删除中...' : '删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
        </TabsContent>

        {/* 团队管理 Tab */}
        {canViewTeam && (
          <TabsContent value="team" className="mt-6">
            <UserManagement
              stores={stores.map((s) => ({ id: s.id, name: s.name }))}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
            />
          </TabsContent>
        )}

        {/* API 配置 Tab */}
        {canManageApi && (
          <TabsContent value="api" className="mt-6">
            <ApiConfig />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
