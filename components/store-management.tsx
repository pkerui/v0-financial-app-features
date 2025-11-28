'use client'

import { useState } from 'react'
import { Store, createStore, updateStore, deleteStore } from '@/lib/api/stores'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash2, Store as StoreIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface StoreManagementProps {
  initialStores: Store[]
}

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  preparing: 'bg-blue-100 text-blue-800',
  closed: 'bg-red-100 text-red-800',
}

const statusLabels: Record<string, string> = {
  active: '营业中',
  inactive: '停业',
  preparing: '筹备中',
  closed: '已关闭',
}

const typeLabels: Record<string, string> = {
  direct: '直营',
  franchise: '加盟',
}

export function StoreManagement({ initialStores }: StoreManagementProps) {
  const router = useRouter()
  const [stores, setStores] = useState<Store[]>(initialStores)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingStore, setEditingStore] = useState<Store | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'direct' as 'direct' | 'franchise',
    status: 'active' as 'active' | 'inactive' | 'preparing' | 'closed',
    province: '',
    city: '',
    address: '',
    manager_name: '',
    manager_phone: '',
  })

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      type: 'direct',
      status: 'active',
      province: '',
      city: '',
      address: '',
      manager_name: '',
      manager_phone: '',
    })
    setError(null)
  }

  const handleCreate = async () => {
    setIsSubmitting(true)
    setError(null)

    const { data, error } = await createStore({
      name: formData.name,
      code: formData.code || undefined,
      type: formData.type,
      status: formData.status,
      province: formData.province || undefined,
      city: formData.city || undefined,
      address: formData.address || undefined,
      manager_name: formData.manager_name || undefined,
      manager_phone: formData.manager_phone || undefined,
    })

    if (error) {
      setError(error)
      setIsSubmitting(false)
      return
    }

    if (data) {
      setStores([data, ...stores])
      setIsCreateDialogOpen(false)
      resetForm()
      router.refresh()
    }

    setIsSubmitting(false)
  }

  const handleEdit = (store: Store) => {
    setEditingStore(store)
    setFormData({
      name: store.name,
      code: store.code || '',
      type: store.type || 'direct',
      status: store.status,
      province: store.province || '',
      city: store.city || '',
      address: store.address || '',
      manager_name: store.manager_name || '',
      manager_phone: store.manager_phone || '',
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdate = async () => {
    if (!editingStore) return

    setIsSubmitting(true)
    setError(null)

    const { data, error } = await updateStore(editingStore.id, {
      name: formData.name,
      code: formData.code || undefined,
      type: formData.type,
      status: formData.status,
      province: formData.province || undefined,
      city: formData.city || undefined,
      address: formData.address || undefined,
      manager_name: formData.manager_name || undefined,
      manager_phone: formData.manager_phone || undefined,
    })

    if (error) {
      setError(error)
      setIsSubmitting(false)
      return
    }

    if (data) {
      setStores(stores.map((s) => (s.id === data.id ? data : s)))
      setIsEditDialogOpen(false)
      setEditingStore(null)
      resetForm()
      router.refresh()
    }

    setIsSubmitting(false)
  }

  const handleDelete = async (store: Store) => {
    if (!confirm(`确定要删除店铺"${store.name}"吗？`)) {
      return
    }

    const { success, error } = await deleteStore(store.id)

    if (error) {
      alert(error)
      return
    }

    if (success) {
      setStores(stores.filter((s) => s.id !== store.id))
      router.refresh()
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <StoreIcon className="h-8 w-8" />
            店铺管理
          </h1>
          <p className="text-gray-600 mt-1">管理您的所有店铺信息</p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              新增店铺
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>新增店铺</DialogTitle>
              <DialogDescription>填写店铺基本信息</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">店铺名称 *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="例如: 朝阳店"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="code">店铺编码</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="例如: BJ001"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">店铺类型</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: 'direct' | 'franchise') =>
                      setFormData({ ...formData, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="direct">直营</SelectItem>
                      <SelectItem value="franchise">加盟</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">状态</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(
                      value: 'active' | 'inactive' | 'preparing' | 'closed'
                    ) => setFormData({ ...formData, status: value })}
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="province">省份</Label>
                  <Input
                    id="province"
                    value={formData.province}
                    onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                    placeholder="例如: 北京市"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">城市</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="例如: 朝阳区"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">详细地址</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="例如: 朝阳区建国路88号"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="manager_name">店长姓名</Label>
                  <Input
                    id="manager_name"
                    value={formData.manager_name}
                    onChange={(e) => setFormData({ ...formData, manager_name: e.target.value })}
                    placeholder="例如: 张三"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="manager_phone">店长电话</Label>
                  <Input
                    id="manager_phone"
                    value={formData.manager_phone}
                    onChange={(e) =>
                      setFormData({ ...formData, manager_phone: e.target.value })
                    }
                    placeholder="例如: 13800138000"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreateDialogOpen(false)
                  resetForm()
                }}
                disabled={isSubmitting}
              >
                取消
              </Button>
              <Button onClick={handleCreate} disabled={isSubmitting || !formData.name}>
                {isSubmitting ? '创建中...' : '创建'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {stores.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
          <StoreIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold mb-2">暂无店铺</h3>
          <p className="text-gray-600 mb-4">开始添加您的第一家店铺</p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            新增店铺
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <Table className="table-fixed w-full">
            <TableHeader>
              <TableRow>
                <TableHead>店铺名称</TableHead>
                <TableHead>编码</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>位置</TableHead>
                <TableHead>店长</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stores.map((store) => (
                <TableRow key={store.id}>
                  <TableCell className="font-medium">{store.name}</TableCell>
                  <TableCell>{store.code || '-'}</TableCell>
                  <TableCell>{typeLabels[store.type || 'direct']}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[store.status]}>
                      {statusLabels[store.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {store.province || store.city
                      ? `${store.province || ''} ${store.city || ''}`
                      : '-'}
                  </TableCell>
                  <TableCell>{store.manager_name || '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(store)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(store)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑店铺</DialogTitle>
            <DialogDescription>修改店铺信息</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">店铺名称 *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-code">店铺编码</Label>
                <Input
                  id="edit-code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-type">店铺类型</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: 'direct' | 'franchise') =>
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="direct">直营</SelectItem>
                    <SelectItem value="franchise">加盟</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-status">状态</Label>
                <Select
                  value={formData.status}
                  onValueChange={(
                    value: 'active' | 'inactive' | 'preparing' | 'closed'
                  ) => setFormData({ ...formData, status: value })}
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-province">省份</Label>
                <Input
                  id="edit-province"
                  value={formData.province}
                  onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-city">城市</Label>
                <Input
                  id="edit-city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-address">详细地址</Label>
              <Input
                id="edit-address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-manager_name">店长姓名</Label>
                <Input
                  id="edit-manager_name"
                  value={formData.manager_name}
                  onChange={(e) => setFormData({ ...formData, manager_name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-manager_phone">店长电话</Label>
                <Input
                  id="edit-manager_phone"
                  value={formData.manager_phone}
                  onChange={(e) =>
                    setFormData({ ...formData, manager_phone: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false)
                setEditingStore(null)
                resetForm()
              }}
              disabled={isSubmitting}
            >
              取消
            </Button>
            <Button onClick={handleUpdate} disabled={isSubmitting || !formData.name}>
              {isSubmitting ? '保存中...' : '保存'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
