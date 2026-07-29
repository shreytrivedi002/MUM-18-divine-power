import AdminQuestionEditorClient from '../../../../../../components/admin/AdminQuestionEditorClient';

export default function AddQuestionPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { section?: string };
}) {
  return (
    <main className="page-shell survey-shell">
      <AdminQuestionEditorClient
        slug={params.slug}
        mode="add"
        initialSection={searchParams.section}
      />
    </main>
  );
}
