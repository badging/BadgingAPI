import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript';
import { User } from './user.model';
import { IRepoAttributes, IRepoCreationAttributes } from '../../types';

@Table({
  tableName: 'repos',
  timestamps: true,
})
export class Repo extends Model<IRepoAttributes, IRepoCreationAttributes> {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  declare id: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  declare githubRepoId: number | null;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  declare gitlabRepoId: number | null;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare DEICommitSHA: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare repoLink: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare badgeType: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare attachment: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare userId: number;

  @BelongsTo(() => User)
  declare user: User;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;
}
