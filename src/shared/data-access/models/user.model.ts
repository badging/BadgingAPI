import {
  Table,
  Column,
  Model,
  DataType,
  HasMany,
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript';
import { Repo } from './repo.model';
import { IUserAttributes, IUserCreationAttributes } from '../../types';

@Table({
  tableName: 'users',
  timestamps: true,
})
export class User extends Model<IUserAttributes, IUserCreationAttributes> {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  declare id: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare login: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare name: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare email: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  declare githubId: number | null;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  declare gitlabId: number | null;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;

  @HasMany(() => Repo)
  declare repos: Repo[];
}
