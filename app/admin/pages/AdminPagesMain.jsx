'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useRouter } from 'next/navigation';
import Card from '@components/ui/Card';
import Button from '@components/ui/Button';
import Table from '@components/ui/Table';
import Icon from '@components/ui/Icon';
import { toast } from 'react-toastify';
import { getAllPages, deletePage, trackPageActivity } from '@services/api';
import PaginationDynamic from '@components/elements/PaginationDynamic';
import ConfirmationModal from '@components/modal/ConfirmationModal';

const AdminPagesMain = ({ initialPages, initialTotalPages, initialCurrentPage }) => {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(initialCurrentPage);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pageToDeleteId, setPageToDeleteId] = useState(null);
  const [pageToDeleteName, setPageToDeleteName] = useState('');

  const { data: pagesData, isLoading, isError } = useQuery(
    ['adminPages', currentPage], // Query key includes currentPage
    () => getAllPages({ page: currentPage, limit: 5 }),
    {
      initialData: { pages: initialPages, totalPages: initialTotalPages }, // Use initial data
      keepPreviousData: true, // Keep previous data while loading new page
    }
  );

  const deleteMutation = useMutation(deletePage, {
    onSuccess: async () => {
      toast.success('Page deleted successfully');
      if (pageToDeleteId && pageToDeleteName) {
        await trackPageActivity({
          pageId: pageToDeleteId,
          pageName: pageToDeleteName,
          action: 'deleted',
        });
      }
      queryClient.invalidateQueries(['adminPages', currentPage]);
      closeModal();
    },
    onError: (error) => {
      console.error('Error deleting page:', error);
      toast.error('Failed to delete page');
      closeModal();
    },
  });

  const handleEdit = (id) => {
    router.push(`/admin/pages/edit/${id}`);
  };

  const handleDelete = (id) => {
    const page = pagesData?.pages?.find(p => p.id === id);
    if (page) {
      setPageToDeleteId(id);
      setPageToDeleteName(page.title);
      setIsModalOpen(true);
    } else {
      toast.error("Could not find page details to delete.");
    }
  };

  const confirmDelete = () => {
    if (pageToDeleteId) {
      deleteMutation.mutate(pageToDeleteId);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setPageToDeleteId(null);
    setPageToDeleteName('');
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const columns = [
      {
        Header: 'Title',
        accessor: 'title',
      },
      {
        Header: 'Slug',
        accessor: 'slug',
      },
      {
        Header: 'Status',
        accessor: 'status',
        Cell: ({ value }) => (
          <span className={`badge ${value === 'published' ? 'bg-green-500 text-white' : '!bg-red-500 text-white'} px-2 py-1 rounded-full text-xs`}>
            {value}
          </span>
        ),
      },
      {
        Header: 'Created',
        accessor: 'createdAt',
        Cell: ({ value }) => {
          const date = new Date(value);
          return date.toLocaleDateString('en-GB', {
            day: '2-digit', 
            month: 'short', 
            year: 'numeric' 
          });
        },
      },
      {
        Header: 'Actions',
        accessor: 'id',
        Cell: ({ row }) => (
          <div className="flex space-x-3 rtl:space-x-reverse">
            <button
              className="p-2 bg-blue-50 text-blue-500 rounded-lg hover:bg-blue-100"
              type="button"
              onClick={() => handleEdit(row.id)}
            >
              <Icon icon="PencilSquare" className="h-5 w-5" />
            </button>
            <button
              className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100"
              type="button"
              onClick={() => handleDelete(row.id)}
            >
              <Icon icon="Trash" className="h-5 w-5" />
            </button>
          </div>
        ),
      },
    ];

  const pages = pagesData?.pages || [];
  const totalPages = pagesData?.totalPages || 0;

  if (isError) {
      toast.error('Failed to load pages');
  }


  return (
    <>
      <Card>
        <div className="flex justify-between items-center mb-6">
          <h4 className="card-title">Pages</h4>
          <Button
            text="Add New Page"
            icon="Plus"
            className="btn-dark"
            onClick={() => router.push('/admin/pages/new')}
          />
        </div>
        <div className="overflow-x-auto">
          {isLoading && !pagesData ? (
            <div className="flex justify-center items-center h-20">
              <div className="loader animate-spin border-4 border-t-4 rounded-full h-8 w-8 border-primary-500 border-t-transparent"></div>
            </div>
          ) : (
            <>
              <Table columns={columns} data={pages} />
              {totalPages > 1 && (
                <div className="flex justify-center mt-6">
                  <PaginationDynamic
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </Card>

      <ConfirmationModal
        open={isModalOpen}
        onClose={closeModal}
        onConfirm={confirmDelete}
        title="Delete Page"
        description="Are you sure you want to delete this page? This action cannot be undone."
        confirmText="Delete"
        loading={deleteMutation.isLoading}
        danger={true}
      />
    </>
  );
};

export default AdminPagesMain; 